import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// OAuth2 Google JWT helper
async function signJwt(clientEmail: string, privateKeyPem: string, scope: string) {
  const pemHeader = "-----BEGIN PRIVATE KEY-----";
  const pemFooter = "-----END PRIVATE KEY-----";
  const pemContents = privateKeyPem
    .replace(pemHeader, "")
    .replace(pemFooter, "")
    .replace(/\s+/g, "");

  const binaryDerString = atob(pemContents);
  const binaryDer = new Uint8Array(binaryDerString.length);
  for (let i = 0; i < binaryDerString.length; i++) {
    binaryDer[i] = binaryDerString.charCodeAt(i);
  }

  const key = await crypto.subtle.importKey(
    "pkcs8",
    binaryDer.buffer,
    {
      name: "RSASSA-PKCS1-v1_5",
      hash: "SHA-256",
    },
    false,
    ["sign"]
  );

  const header = { alg: "RS256", typ: "JWT" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    iss: clientEmail,
    scope: scope,
    aud: "https://oauth2.googleapis.com/token",
    exp: now + 3600,
    iat: now,
  };

  const encoder = new TextEncoder();
  const headerBase64 = btoa(JSON.stringify(header))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");
  const payloadBase64 = btoa(JSON.stringify(payload))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  const signData = encoder.encode(`${headerBase64}.${payloadBase64}`);
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    signData
  );

  const signatureBase64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, "")
    .replace(/\+/g, "-")
    .replace(/\//g, "_");

  return `${headerBase64}.${payloadBase64}.${signatureBase64}`;
}

async function getGoogleAccessToken(clientEmail: string, privateKeyPem: string) {
  const jwt = await signJwt(clientEmail, privateKeyPem, "https://www.googleapis.com/auth/drive");
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to get Google Access Token: ${await response.text()}`);
  }

  const data = await response.json();
  return data.access_token;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const googleEmail = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')?.replace(/^["']|["']$/g, '')
    const googleKey = Deno.env.get('GOOGLE_PRIVATE_KEY')?.replace(/^["']|["']$/g, '')?.replace(/\\n/g, '\n')
    const googleRootId = Deno.env.get('GOOGLE_DRIVE_ROOT_FOLDER_ID')?.replace(/^["']|["']$/g, '')

    if (!googleEmail || !googleKey || !googleRootId) {
      return new Response(JSON.stringify({ 
        step: 'secrets_check', 
        status: 'FAIL',
        has_email: !!googleEmail,
        has_key: !!googleKey,
        has_root_id: !!googleRootId
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Test 1: Get Access Token
    const token = await getGoogleAccessToken(googleEmail, googleKey);
    
    // Test 2: Check folder access with supportsAllDrives
    const folderCheckUrl = `https://www.googleapis.com/drive/v3/files/${googleRootId}?supportsAllDrives=true&fields=id,name,driveId`;
    const folderResponse = await fetch(folderCheckUrl, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const folderData = await folderResponse.json();

    if (!folderResponse.ok) {
      return new Response(JSON.stringify({
        step: 'folder_check',
        status: 'FAIL',
        token_obtained: true,
        error: folderData
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Test 3: Try creating a subfolder
    const testFolderUrl = `https://www.googleapis.com/drive/v3/files?supportsAllDrives=true&fields=id`;
    const testFolderResponse = await fetch(testFolderUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        name: `TEST_FOLDER_${Date.now()}`,
        mimeType: "application/vnd.google-apps.folder",
        parents: [googleRootId],
      }),
    });
    const testFolderData = await testFolderResponse.json();

    if (!testFolderResponse.ok) {
      return new Response(JSON.stringify({
        step: 'folder_creation',
        status: 'FAIL',
        token_obtained: true,
        folder_info: folderData,
        error: testFolderData
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Test 4: Upload file
    const testContent = new TextEncoder().encode("TEST FILE CONTENT");
    const boundary = "test_boundary";
    const parts = [
      `--${boundary}\r\n`,
      `Content-Type: application/json; charset=UTF-8\r\n\r\n`,
      JSON.stringify({ name: `test_file_${Date.now()}.txt`, parents: [testFolderData.id] }),
      `\r\n--${boundary}\r\n`,
      `Content-Type: text/plain\r\n\r\n`,
      testContent,
      `\r\n--${boundary}--\r\n`
    ];
    const blob = new Blob(parts);

    const uploadUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink&supportsAllDrives=true";
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary=${boundary}`,
      },
      body: blob,
    });
    const uploadData = await uploadResponse.json();

    if (!uploadResponse.ok) {
      return new Response(JSON.stringify({
        step: 'file_upload',
        status: 'FAIL',
        token_obtained: true,
        folder_info: folderData,
        created_folder_id: testFolderData.id,
        error: uploadData
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Clean up created folder to keep Drive tidy (or leave it if desired, but let's delete the file and folder)
    const deleteFileUrl = `https://www.googleapis.com/drive/v3/files/${uploadData.id}?supportsAllDrives=true`;
    await fetch(deleteFileUrl, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    const deleteFolderUrl = `https://www.googleapis.com/drive/v3/files/${testFolderData.id}?supportsAllDrives=true`;
    await fetch(deleteFolderUrl, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` }
    });

    return new Response(JSON.stringify({
      status: 'SUCCESS',
      token_obtained: true,
      folder_info: folderData,
      test_folder_created_and_deleted: true,
      test_file_uploaded_and_deleted: true,
      web_view_link: uploadData.webViewLink
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  } catch (err: any) {
    return new Response(JSON.stringify({ status: 'EXCEPTION', error: err.message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})

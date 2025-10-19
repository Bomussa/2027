/**
 * Admin Login Endpoint
 * POST /api/v1/admin/login
 * Authenticates admin users and returns JWT token
 */

export async function onRequestPost(context) {
  const { request, env } = context;
  
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return jsonResponse({ error: 'Username and password required' }, 400);
    }

    // Get admin credentials from KV_ADMIN
    const adminKey = `admin:${username}`;
    const adminData = await env.KV_ADMIN.get(adminKey, { type: 'json' });

    if (!adminData) {
      // Check default admin (for initial setup)
      if (username === 'admin' && password === 'MMC2025!Admin') {
        // Create default admin in KV
        const defaultAdmin = {
          username: 'admin',
          password_hash: await hashPassword(password, env.JWT_SECRET),
          role: 'super_admin',
          created_at: new Date().toISOString()
        };
        await env.KV_ADMIN.put(adminKey, JSON.stringify(defaultAdmin));
        
        const token = await generateJWT({ username: 'admin', role: 'super_admin' }, env.JWT_SECRET);
        
        return jsonResponse({
          success: true,
          token,
          user: {
            username: 'admin',
            role: 'super_admin'
          },
          message: 'تم تسجيل الدخول بنجاح'
        }, 200);
      }
      
      return jsonResponse({ error: 'Invalid credentials' }, 401);
    }

    // Verify password
    const passwordHash = await hashPassword(password, env.JWT_SECRET);
    
    if (passwordHash !== adminData.password_hash) {
      return jsonResponse({ error: 'Invalid credentials' }, 401);
    }

    // Generate JWT token
    const token = await generateJWT({
      username: adminData.username,
      role: adminData.role
    }, env.JWT_SECRET);

    // Update last login
    adminData.last_login = new Date().toISOString();
    await env.KV_ADMIN.put(adminKey, JSON.stringify(adminData));

    return jsonResponse({
      success: true,
      token,
      user: {
        username: adminData.username,
        role: adminData.role
      },
      message: 'تم تسجيل الدخول بنجاح'
    }, 200);

  } catch (error) {
    return jsonResponse({ error: error.message }, 500);
  }
}

async function hashPassword(password, secret) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + secret);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

async function generateJWT(payload, secret) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const now = Math.floor(Date.now() / 1000);
  
  const jwtPayload = {
    ...payload,
    iat: now,
    exp: now + (24 * 60 * 60) // 24 hours
  };

  const encodedHeader = btoa(JSON.stringify(header));
  const encodedPayload = btoa(JSON.stringify(jwtPayload));
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  
  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(signatureInput)
  );
  
  const encodedSignature = btoa(String.fromCharCode(...new Uint8Array(signature)));
  
  return `${signatureInput}.${encodedSignature}`;
}

function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache, no-store, must-revalidate'
    }
  });
}


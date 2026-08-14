async function testLogin(email, password) {
  try {
    console.log(`Testing login for ${email}...`);
    const res = await fetch('http://localhost:5000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
      console.log('Login successful!');
      console.log('User:', data.user);
      console.log('Token Received');
    } else {
      console.error('Login failed:', data);
    }
  } catch (err) {
    console.error('Login error:', err.message);
  }
}

async function run() {
  await testLogin('admin@citycolleges.info', 'admin123');
  console.log('---');
  await testLogin('vikram@citycolleges.info', 'teacher123');
  console.log('---');
  await testLogin('amit@citycolleges.info', 'student123');
}

run();

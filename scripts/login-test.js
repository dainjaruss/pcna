(async () => {
  try {
    const url = 'http://localhost:3000/api/auth/login'
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: 'test@example.com', password: 'Password123!' }),
    })
    console.log('status', res.status)
    console.log('set-cookie', res.headers.get('set-cookie'))
    const text = await res.text()
    console.log('body', text)
  } catch (e) {
    console.error('request failed:', e.message)
  }
})()

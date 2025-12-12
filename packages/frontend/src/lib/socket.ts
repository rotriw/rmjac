import { cookies } from 'next/headers';
import { io } from 'socket.io-client';

export const URL = process.env.NEXT_PUBLIC_SOCKET_IO_URL || 'http://localhost:1825/user_notify';

export const socket = io(URL, {
  autoConnect: true,
});

socket.on('connect', () => {
  console.log('Socket connected:', socket.id);
  // get token from cookies
  const uid = +document.cookie.split('; ').find(row => row.startsWith('_uid='))?.split('=')[1] || null;
  const token = document.cookie.split('; ').find(row => row.startsWith('token='))?.split('=')[1] || null;
  console.log(uid, token);
  let d = socket.emit('auth', {
    "token": token,
    "user_id": uid,
  });
  console.log(d);
});
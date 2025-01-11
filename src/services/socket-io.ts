import { Socket, io } from "socket.io-client";

const socket: Socket = io(process.env.REACT_APP_API_URL as string, {
  autoConnect: true,
});

export default socket;

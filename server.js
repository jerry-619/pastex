import { createServer } from "node:http";
import next from "next";
import { Server } from "socket.io";

const dev = process.env.NODE_ENV !== "production";
const hostname = "localhost";
const port = process.env.PORT || 3000;

// Initialize the Next.js app
const app = next({ dev, hostname, port });
const handler = app.getRequestHandler();

app.prepare().then(() => {
  const httpServer = createServer(handler);

  // Initialize Socket.io
  const io = new Server(httpServer);
  
  // Track room hosts and permissions
  const roomStates = {};

  const broadcastPermissions = (roomId) => {
    if (roomStates[roomId]) {
      io.to(roomId).emit("permissions-updated", roomStates[roomId]);
    }
  };

  const autoAssignHost = (roomId) => {
    const room = io.sockets.adapter.rooms.get(roomId);
    if (!room || room.size === 0) {
      delete roomStates[roomId];
      return;
    }
    if (roomStates[roomId] && !room.has(roomStates[roomId].host)) {
      const nextHost = room.values().next().value;
      if (nextHost) {
        roomStates[roomId].host = nextHost;
        roomStates[roomId].permissions[nextHost] = { canText: true, canFile: true };
        broadcastPermissions(roomId);
      }
    }
  };

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    /**
     * Handles a user joining a specific room.
     * @param {string} roomId - The unique 6-character room identifier.
     */
    socket.on("join-room", (roomId) => {
      socket.join(roomId);
      console.log(`Socket ${socket.id} joined room ${roomId}`);
      
      if (!roomStates[roomId]) {
        roomStates[roomId] = { host: socket.id, permissions: {} };
      }
      // By default, only the host can text and send files
      const isHost = roomStates[roomId].host === socket.id;
      roomStates[roomId].permissions[socket.id] = { canText: isHost, canFile: isHost };
      
      // Notify others in the room
      socket.to(roomId).emit("user-joined", socket.id);
      
      // Get count of clients in room
      const roomSize = io.sockets.adapter.rooms.get(roomId)?.size || 0;
      io.to(roomId).emit("room-user-count", roomSize);
      
      broadcastPermissions(roomId);
    });

    /**
     * Handle host toggling permissions
     */
    socket.on("update-permission", ({ roomId, targetId, canText, canFile }) => {
      if (roomStates[roomId] && roomStates[roomId].host === socket.id) {
        if (roomStates[roomId].permissions[targetId]) {
          roomStates[roomId].permissions[targetId] = { canText, canFile };
          broadcastPermissions(roomId);
        }
      }
    });

    /**
     * Synchronizes the text buffer across all peers in a room.
     * @param {Object} payload
     * @param {string} payload.roomId
     * @param {string} payload.text - The current text buffer state.
     */
    socket.on("text-change", ({ roomId, text }) => {
      if (roomStates[roomId] && roomStates[roomId].permissions[socket.id]?.canText) {
        socket.to(roomId).emit("text-update", text);
      }
    });

    /**
     * WebRTC Signaling: Relays the SDP Offer to the target peer.
     */
    socket.on("webrtc-offer", ({ target, caller, sdp }) => {
      io.to(target).emit("webrtc-offer", { caller, sdp });
    });

    /**
     * WebRTC Signaling: Relays the SDP Answer back to the caller.
     */
    socket.on("webrtc-answer", ({ target, sdp }) => {
      io.to(target).emit("webrtc-answer", { target: socket.id, sdp });
    });

    /**
     * WebRTC Signaling: Relays ICE candidates between peers to establish the P2P connection.
     */
    socket.on("webrtc-ice-candidate", ({ target, candidate }) => {
      io.to(target).emit("webrtc-ice-candidate", { target: socket.id, candidate });
    });

    /**
     * Gracefully handles a user leaving a room.
     */
    socket.on("leave-room", (roomId) => {
      socket.leave(roomId);
      console.log(`Socket ${socket.id} left room ${roomId}`);
      socket.to(roomId).emit("user-left", socket.id);
      
      if (roomStates[roomId] && roomStates[roomId].permissions[socket.id]) {
        delete roomStates[roomId].permissions[socket.id];
      }
      autoAssignHost(roomId);
      broadcastPermissions(roomId);
      
      const roomSize = io.sockets.adapter.rooms.get(roomId)?.size || 0;
      io.to(roomId).emit("room-user-count", roomSize);
    });

    socket.on("disconnecting", () => {
      // Notify all rooms the user was in
      socket.rooms.forEach((roomId) => {
        if (roomId !== socket.id) {
          socket.to(roomId).emit("user-left", socket.id);
          
          if (roomStates[roomId] && roomStates[roomId].permissions[socket.id]) {
            delete roomStates[roomId].permissions[socket.id];
          }
          autoAssignHost(roomId);
          broadcastPermissions(roomId);
          
          const roomSize = (io.sockets.adapter.rooms.get(roomId)?.size || 1) - 1;
          io.to(roomId).emit("room-user-count", roomSize);
        }
      });
    });

    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  httpServer
    .once("error", (err) => {
      console.error(err);
      process.exit(1);
    })
    .listen(port, () => {
      console.log(`> Ready on http://${hostname}:${port}`);
    });
});

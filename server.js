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
      const { host, permissions, sockets } = roomStates[roomId];
      io.to(roomId).emit("permissions-updated", { host, permissions, sockets });
    }
  };

  const broadcastUserCount = (roomId) => {
    if (roomStates[roomId] && roomStates[roomId].sockets) {
      const uniqueUsers = new Set(Object.values(roomStates[roomId].sockets));
      io.to(roomId).emit("room-user-count", uniqueUsers.size);
    } else {
      io.to(roomId).emit("room-user-count", 0);
    }
  };

  const autoAssignHost = (roomId, disconnectedUserId) => {
    if (roomStates[roomId] && roomStates[roomId].host === disconnectedUserId) {
      roomStates[roomId].autoAssignTimer = setTimeout(() => {
        if (!roomStates[roomId]) return;
        
        const room = io.sockets.adapter.rooms.get(roomId);
        if (!room || room.size === 0) {
          delete roomStates[roomId];
          return;
        }
        
        // Pick the first available socket's userId as the new host
        const firstSocketId = room.values().next().value;
        const nextHostId = roomStates[roomId].sockets[firstSocketId];
        
        if (nextHostId) {
          roomStates[roomId].host = nextHostId;
          roomStates[roomId].permissions[nextHostId] = { canText: true, canFile: true };
          broadcastPermissions(roomId);
        }
      }, 7000); // 3-second grace period
    }
  };

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    /**
     * Handles a user joining a specific room.
     * @param {string} roomId - The unique 6-character room identifier.
     */
    socket.on("join-room", ({ roomId, userId, action }) => {
      socket.data = { userId };
      
      if (!roomStates[roomId]) {
        if (action === 'create') {
          roomStates[roomId] = { host: userId, permissions: {}, sockets: {} };
        } else {
          socket.emit("room-error", "Room does not exist! Please create a new room from the home page.");
          return;
        }
      }
      
      socket.join(roomId);
      console.log(`Socket ${socket.id} (User: ${userId}) joined room ${roomId}`);
      
      roomStates[roomId].sockets[socket.id] = userId;
      
      // If user reconnects, clear any pending auto-assign timer
      if (roomStates[roomId].host === userId && roomStates[roomId].autoAssignTimer) {
        clearTimeout(roomStates[roomId].autoAssignTimer);
        delete roomStates[roomId].autoAssignTimer;
      }
      
      // Assign default permissions if they don't have any yet
      if (!roomStates[roomId].permissions[userId]) {
        const isHost = roomStates[roomId].host === userId;
        roomStates[roomId].permissions[userId] = { canText: isHost, canFile: isHost };
      }
      
      // Notify others in the room
      socket.to(roomId).emit("user-joined", socket.id);
      
      broadcastUserCount(roomId);
      broadcastPermissions(roomId);
    });

    /**
     * Handle host toggling permissions
     */
    socket.on("update-permission", ({ roomId, targetSocketId, canText, canFile }) => {
      const myUserId = socket.data?.userId;
      if (roomStates[roomId] && roomStates[roomId].host === myUserId) {
        const targetUserId = roomStates[roomId].sockets[targetSocketId];
        if (targetUserId && roomStates[roomId].permissions[targetUserId]) {
          roomStates[roomId].permissions[targetUserId] = { canText, canFile };
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
      const myUserId = socket.data?.userId;
      if (roomStates[roomId] && roomStates[roomId].permissions[myUserId]?.canText) {
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
      const userId = socket.data?.userId;
      console.log(`Socket ${socket.id} left room ${roomId}`);
      socket.to(roomId).emit("user-left", socket.id);
      
      if (roomStates[roomId]) {
        delete roomStates[roomId].sockets[socket.id];
        // We do NOT delete permissions immediately, so they can recover them if they refresh
        autoAssignHost(roomId, userId);
        broadcastPermissions(roomId);
        broadcastUserCount(roomId);
      }
    });

    socket.on("disconnecting", () => {
      const userId = socket.data?.userId;
      // Notify all rooms the user was in
      socket.rooms.forEach((roomId) => {
        if (roomId !== socket.id) {
          socket.to(roomId).emit("user-left", socket.id);
          
          if (roomStates[roomId]) {
            delete roomStates[roomId].sockets[socket.id];
            autoAssignHost(roomId, userId);
            broadcastPermissions(roomId);
            broadcastUserCount(roomId);
          }
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

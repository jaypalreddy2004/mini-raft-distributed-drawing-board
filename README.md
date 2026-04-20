# 🎨 Mini RAFT Distributed Drawing Board

## 📌 Overview

This project is a distributed real-time collaborative drawing application built using the RAFT consensus algorithm. It allows multiple users to draw simultaneously while ensuring consistency and fault tolerance across distributed replica nodes.

---

## 🚀 Features

* Real-time collaborative drawing
* Multi-user support using WebSocket
* RAFT-based leader election
* Log replication for consistency
* Fault tolerance with automatic leader re-election
* Chat functionality
* Cluster monitoring panel

---

## 🧠 Tech Stack

* Frontend: React, Tailwind CSS
* Backend: Node.js, Express
* Communication: WebSocket
* Distributed System: RAFT Algorithm
* Deployment: Docker, Docker Compose

---

## 🏗️ Architecture

The system consists of three main components:

* Frontend (React UI)
* Gateway Server
* Replica Nodes (RAFT Cluster)

### Flow:

Client → Gateway → Leader → Followers → Clients

---

## ⚙️ How It Works

1. The client connects to the gateway using WebSocket.
2. The gateway identifies the current leader node.
3. User actions (drawing/chat) are sent to the leader.
4. The leader replicates data to follower nodes.
5. Once a majority of nodes agree, the data is committed.
6. Updates are broadcasted to all connected clients.

---

## 🔁 RAFT Concepts Used

* Leader Election
* Heartbeat Mechanism
* Log Replication
* Majority Consensus

---

## 🐳 Running the Project

### Prerequisites:

* Docker installed

### Run:

```bash
docker compose up --build
```

---

## 🌐 Access

* Frontend: http://localhost:5173
* Gateway: http://localhost:3000

---

## ⚠️ Limitations

* No persistent storage (in-memory logs)
* Limited to small cluster
* No authentication implemented

---

## 🔮 Future Enhancements

* Add database for persistence
* Improve scalability
* Add authentication system
* Optimize performance

---

## 📄 License

This project is for academic purposes.

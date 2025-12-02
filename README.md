# Sales Order Manager

[![CI/CD](https://github.com/FeliksML/sales-orders-manager/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/FeliksML/sales-orders-manager/actions/workflows/ci-cd.yml)

A full-stack web application that allows Spectrum sales representatives to manage and track sales orders with intelligent PDF auto-extraction and analytics dashboard.

## 🚀 Live Demo

🔗 [View Live Application](#) *(Coming soon)*

## ✨ Features

- 🔐 **Secure Authentication** - User signup/login with encrypted password storage
- 📝 **Quick Order Entry** - Intuitive form for manual order input
- 📄 **PDF Auto-Extraction** - Drag-and-drop PDF upload with automatic data parsing
- 📊 **Interactive Dashboard** - Visual analytics with charts and filterable tables
- 🌓 **Dark/Light Mode** - Toggle between themes for comfortable viewing
- 📱 **Responsive Design** - Optimized for desktop and mobile devices

## 🛠️ Tech Stack

**Frontend:**
- React 18
- TailwindCSS
- Recharts (for data visualization)
- Lucide React (icons)

**Backend:**
- Python 3.11+
- FastAPI
- PostgreSQL
- PyMuPDF / pdfplumber (PDF parsing)

**Deployment:**
- Docker Compose with PostgreSQL
- DigitalOcean VM / Any Ubuntu server
- Nginx reverse proxy with SSL/TLS

## 📦 Project Structure

```
sales-order-manager/
├── backend/          # FastAPI Python backend
│   ├── app/
│   ├── requirements.txt
│   └── README.md
├── frontend/         # React frontend
│   ├── src/
│   ├── public/
│   └── package.json
└── README.md
```

## 🚀 Deployment Options

### Option 1: Production VM Deployment (Recommended)

Deploy to a DigitalOcean VM or any Ubuntu server with just 3 commands:

```bash
sudo ./setup_vm.sh      # Install Docker, Nginx, SSL tools
./configure_env.sh      # Configure environment variables
sudo ./deploy.sh your-domain.com  # Deploy with HTTPS
```

**See [VM_DEPLOYMENT.md](VM_DEPLOYMENT.md) for complete deployment guide.**

**Requirements:**
- Ubuntu 22.04 or 24.04 server
- 2GB RAM, 2 vCPUs, 50GB disk (minimum)
- Domain name (optional, but required for HTTPS)

### Option 2: Development Setup

For local development and testing:

## 🚦 Getting Started (Local Development)

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- PostgreSQL 14+ OR Docker

### Installation

**1. Clone the repository**

```bash
git clone https://github.com/FeliksML/sales-orders-manager.git
cd sales-orders-manager
```

**2. Backend Setup**

```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

Create a `.env` file:
```
DATABASE_URL=postgresql://user:password@localhost/spectrum_orders
SECRET_KEY=your-secret-key-here
```

**3. Frontend Setup**

```bash
cd frontend
npm install
```

**4. Run with Docker Compose (Easiest)**

```bash
# Start all services (database, backend, frontend)
docker-compose up -d

# Initialize database
docker-compose exec backend python init_database.py

# View logs
docker-compose logs -f
```

Access the application:
- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Docs: http://localhost:8000/docs

**OR Run Manually**

Backend:
```bash
cd backend
# Set up .env file first (see backend/.env.example)
uvicorn app.main:app --reload --port 8000
```

Frontend:
```bash
cd frontend
# Set up .env file first (see frontend/.env.example)
npm run dev
```

## 📊 Database Schema

**Users Table:**
- userid (Primary Key, auto-generated)
- email (unique)
- password (hashed)
- salesid
- name

**Orders Table:**
- orderid (Primary Key, auto-generated)
- userid (Foreign Key)
- spectrum_reference
- customer_account_number
- customer_security_code
- job_number
- business_name
- customer_name
- customer_address
- customer_phone
- install_date
- install_time
- Product flags: has_internet, has_voice, has_tv, has_sbc, has_mobile
- mobile_activated
- has_wib
- notes

## 🗺️ Development Status

- [x] Project setup and planning
- [x] Database schema design
- [x] Backend API development
- [x] User authentication system
- [x] Frontend UI components
- [x] Manual order entry form
- [x] Dashboard analytics with filtering
- [x] Email notifications (password reset, order updates)
- [x] Admin panel and user management
- [x] Audit logging and error tracking
- [x] Docker deployment setup
- [x] VM deployment automation
- [ ] PDF parsing integration (planned)
- [ ] SMS notifications via Twilio (optional)
- [ ] Mobile app (React Native) (in progress)

## 📸 Screenshots

*Screenshots coming soon*

## 🤝 Contributing

This is a personal portfolio project, but feedback and suggestions are welcome!

## 📄 License

MIT License - feel free to use this project as a learning resource.

## 👤 Author

**Your Name**
- GitHub: [@FeliksML](https://github.com/FeliksML)
- Portfolio: *[Your portfolio URL]*

---

*Built as a full-stack portfolio project to demonstrate React, Python, PostgreSQL, and modern web development practices.*
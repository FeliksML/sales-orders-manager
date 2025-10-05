# Sales Order Manager

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
- Frontend: *TBD (Vercel/Netlify)*
- Backend: *TBD (Render/Railway)*
- Database: *TBD (Supabase/Railway)*

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

## 🚦 Getting Started

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- PostgreSQL 14+

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

**4. Database Setup**

```bash
# Instructions coming soon
```

**5. Run the application**

Backend:
```bash
cd backend
uvicorn app.main:app --reload
```

Frontend:
```bash
cd frontend
npm start
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

## 🗺️ Roadmap

- [x] Project setup and planning
- [x] Database schema design
- [ ] Backend API development
- [ ] User authentication system
- [ ] Frontend UI components
- [ ] Manual order entry form
- [ ] PDF parsing integration
- [ ] Dashboard analytics
- [ ] Deployment

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
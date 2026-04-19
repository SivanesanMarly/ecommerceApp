# Urban Cart React Website

Production-ready React + TypeScript ecommerce website connected to the existing backend APIs in `../backend/main2.py`.

## Features

- Modern responsive storefront with custom gradient UI system
- Motion animations with Framer Motion
- Customer flow: browse, search, cart, checkout, order history, order details
- Admin flow: live orders, update statuses, shop settings, product creation/deletion, supplier management, supply orders
- Supplier flow: product creation/deletion, supply request accept/reject
- Realtime polling for products, orders, supply updates, and unread notifications

## Run locally

1. Start backend (Flask API):

```bash
cd ../backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements1.txt
python main2.py
```

2. Start React website:

```bash
npm install
npm run dev
```

3. Optional backend URL override:

```bash
VITE_BACKEND_BASE_URL=http://localhost:8000 npm run dev
```

## Build for production

```bash
VITE_BACKEND_BASE_URL=https://your-api-domain npm run build
npm run preview
```

## Tech Stack

- React 19 + TypeScript
- Vite
- Axios
- Framer Motion

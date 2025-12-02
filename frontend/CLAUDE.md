# Frontend: React 19 + Vite + TailwindCSS

## Structure
- pages/: Route components (lazy-loaded)
- components/: Reusable UI components
- services/: Axios API functions
- contexts/: AuthContext, DashboardDataContext, ToastContext
- hooks/: Custom React hooks
- utils/: Helper functions

## Patterns

```jsx
// Component with hooks
function OrderList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();

  // Always handle loading/error states
}

// API calls via services
import { getOrders } from '../services/api';

// Styling - TailwindCSS only
<div className="flex items-center gap-4 p-4 bg-white rounded-lg shadow">
```

## Key Components (largest files)
- OrderDetailsModal.jsx (62KB): View/edit order
- OrderInputModal.jsx (48KB): Create new order
- Dashboard.jsx: Main analytics view

## Rules
- Use existing components before creating new ones
- All forms need validation + loading states
- Handle API errors with toast notifications
- Mobile-first responsive design

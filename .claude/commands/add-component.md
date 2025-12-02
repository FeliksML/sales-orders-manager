Add a new React component: $ARGUMENTS

## Checklist
1. **Check existing components first**
   - Can an existing component be extended?
   - Is there a similar pattern to follow?

2. **Component file** (frontend/src/components/[Name].jsx)
   - Functional component with hooks
   - PropTypes or JSDoc for props
   - Loading and error states

3. **Styling**
   - TailwindCSS utilities only
   - Follow existing spacing/color conventions
   - Responsive design (mobile-first)

4. **Integration**
   - Import in parent component
   - Connect to context if needed
   - Handle API calls via services/

## Pattern to Follow
```jsx
import { useState, useEffect } from 'react';
import { useToast } from '../contexts/ToastContext';

export default function ComponentName({ prop1, prop2, onAction }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const { showToast } = useToast();

  const handleAction = async () => {
    setLoading(true);
    try {
      await onAction();
      showToast('Success!', 'success');
    } catch (err) {
      setError(err.message);
      showToast('Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorMessage message={error} />;

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      {/* Component content */}
    </div>
  );
}
```

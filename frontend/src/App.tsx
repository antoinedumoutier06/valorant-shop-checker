import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { WishlistProvider } from './context/WishlistContext';
import ErrorBoundary from './components/ErrorBoundary';
import ProtectedRoute from './components/ProtectedRoute';
import LoginPage from './pages/LoginPage';
import ShopPage from './pages/ShopPage';
import WishlistPage from './pages/WishlistPage';

export default function App() {
  return (
    <AuthProvider>
      <WishlistProvider>
        <BrowserRouter>
          <ErrorBoundary>
            <Routes>
              <Route path="/" element={<LoginPage />} />
              <Route
                path="/add-account"
                element={
                  <ProtectedRoute>
                    <LoginPage addMode />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/shop"
                element={
                  <ProtectedRoute>
                    <ShopPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/wishlist"
                element={
                  <ProtectedRoute>
                    <WishlistPage />
                  </ProtectedRoute>
                }
              />
            </Routes>
          </ErrorBoundary>
        </BrowserRouter>
      </WishlistProvider>
    </AuthProvider>
  );
}

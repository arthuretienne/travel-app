// frontend/src/App.jsx
import { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ClerkProvider, SignedIn, SignedOut } from '@clerk/clerk-react';
import { frFR } from '@clerk/localizations';

// Pages - eagerly loaded (critical path)
import Landing from './pages/Landing';

// Pages - lazy loaded (code splitting)
const Onboarding = lazy(() => import('./pages/Onboarding'));
const Dashboard = lazy(() => import('./pages/Dashboard'));
const CreateTrip = lazy(() => import('./pages/CreateTrip'));
const Results = lazy(() => import('./pages/Results'));
const Account = lazy(() => import('./pages/Account'));
const Pricing = lazy(() => import('./pages/Pricing'));
const TripDetail = lazy(() => import('./pages/TripDetail'));
const SavedTripDetail = lazy(() => import('./pages/SavedTripDetail'));
const AcceptInvitation = lazy(() => import('./pages/AcceptInvitation'));
const PriceAlerts = lazy(() => import('./pages/PriceAlerts'));
const Destinations = lazy(() => import('./pages/Destinations'));
const DestinationLanding = lazy(() => import('./pages/DestinationLanding'));
const TripProposal = lazy(() => import('./pages/TripProposal'));
const Privacy = lazy(() => import('./pages/legal/Privacy'));
const Terms = lazy(() => import('./pages/legal/Terms'));
const MentionsLegales = lazy(() => import('./pages/legal/MentionsLegales'));
const Contact = lazy(() => import('./pages/legal/Contact'));

// Layout
import AppLayout from './components/Layout/AppLayout';

// DEV-ONLY persona impersonation
import { DEV_AUTH_ACTIVE, isDevImpersonating } from './lib/devAuth';
const DevPersonaBar = lazy(() => import('./components/DevPersonaBar'));

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// Clerk en français, brandé Skusku. Les sous-titres sont forcés pour ne pas
// dépendre du nom d'application configuré côté dashboard Clerk (« Travel App »).
const clerkLocalization = {
  ...frFR,
  signIn: {
    ...frFR.signIn,
    start: { ...frFR.signIn.start, subtitle: 'pour continuer vers Skusku' },
  },
  signUp: {
    ...frFR.signUp,
    start: { ...frFR.signUp.start, subtitle: 'pour continuer vers Skusku' },
  },
};

if (!PUBLISHABLE_KEY) {
  console.warn('Missing Clerk Publishable Key - Auth features will be disabled');
}

// Protected Route wrapper
function ProtectedRoute({ children }) {
  // DEV-ONLY: when impersonating a seeded persona, skip Clerk gating entirely.
  if (DEV_AUTH_ACTIVE && isDevImpersonating()) {
    return <AppLayout>{children}</AppLayout>;
  }
  return (
    <>
      <SignedIn>
        <AppLayout>{children}</AppLayout>
      </SignedIn>
      <SignedOut>
        <Navigate to="/" replace />
      </SignedOut>
    </>
  );
}

// App content with routing
function AppContent() {
  return (
    <Router>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-4 border-gray-200 border-t-primary rounded-full animate-spin" /></div>}>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/destinations" element={<Destinations />} />
        <Route path="/destination/:slug" element={<DestinationLanding />} />
        {/* Pricing is public so prospects can evaluate before signing up. */}
        <Route path="/pricing" element={<Pricing />} />

        {/* Legal & contact — public (obligation légale FR/UE pour un service payant) */}
        <Route path="/privacy" element={<Privacy />} />
        <Route path="/terms" element={<Terms />} />
        <Route path="/mentions-legales" element={<MentionsLegales />} />
        <Route path="/contact" element={<Contact />} />

        {/* Onboarding Route - Semi-Protected */}
        <Route
          path="/onboarding"
          element={
            <>
              <SignedIn>
                <Onboarding />
              </SignedIn>
              <SignedOut>
                <Navigate to="/" replace />
              </SignedOut>
            </>
          }
        />

        {/* Protected Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-trip"
          element={
            <ProtectedRoute>
              <CreateTrip />
            </ProtectedRoute>
          }
        />
        <Route
          path="/results/:searchId"
          element={
            <ProtectedRoute>
              <Results />
            </ProtectedRoute>
          }
        />
        <Route
          path="/results"
          element={
            <ProtectedRoute>
              <Results />
            </ProtectedRoute>
          }
        />
        <Route
          path="/account"
          element={
            <ProtectedRoute>
              <Account />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trips/:id"
          element={
            <ProtectedRoute>
              <TripDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/saved-trips/:id"
          element={
            <ProtectedRoute>
              <SavedTripDetail />
            </ProtectedRoute>
          }
        />
        <Route
          path="/price-alerts"
          element={
            <ProtectedRoute>
              <PriceAlerts />
            </ProtectedRoute>
          }
        />

        <Route
          path="/trip-proposal"
          element={
            <ProtectedRoute>
              <TripProposal />
            </ProtectedRoute>
          }
        />

        {/* Public invitation acceptance - no auth required */}
        <Route path="/accept-invitation/:token" element={<AcceptInvitation />} />

        {/* Catch all - redirect to landing */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </Suspense>
      {DEV_AUTH_ACTIVE && (
        <Suspense fallback={null}>
          <DevPersonaBar />
        </Suspense>
      )}
    </Router>
  );
}

function App() {
  if (!PUBLISHABLE_KEY) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg max-w-md text-center border border-red-100">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Configuration Error</h1>
          <p className="text-gray-600">Missing Clerk Publishable Key. Please add VITE_CLERK_PUBLISHABLE_KEY to your .env file.</p>
        </div>
      </div>
    );
  }

  return (
    <ClerkProvider
      publishableKey={PUBLISHABLE_KEY}
      localization={clerkLocalization}
      signInFallbackRedirectUrl="/dashboard"
      signUpFallbackRedirectUrl="/onboarding"
      afterSignOutUrl="/"
    >
      <AppContent />
    </ClerkProvider>
  );
}

export default App;

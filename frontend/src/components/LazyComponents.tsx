import { lazy, Suspense, ComponentType, Component, ReactNode } from 'react';

// Loading fallback components with different sizes
const SmallLoader = () => (
  <div className="flex items-center justify-center p-2">
    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
  </div>
);

const MediumLoader = () => (
  <div className="flex items-center justify-center p-4">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
  </div>
);

const LargeLoader = () => (
  <div className="flex items-center justify-center p-8">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
    <span className="ml-3 text-gray-600">Loading...</span>
  </div>
);

const MapLoader = () => (
  <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
    <div className="text-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-2"></div>
      <p className="text-gray-600">Loading map...</p>
    </div>
  </div>
);

// Enhanced lazy component creator with retry mechanism
const createLazyComponent = <T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T } | any>,
  FallbackComponent: ComponentType = MediumLoader,
  retryCount: number = 2
) => {
  const LazyComponent = lazy(() => 
    importFn().catch(error => {
      console.error('Failed to load component:', error);
      
      // Retry mechanism
      let attempts = 0;
      const retry = (): Promise<{ default: T }> => {
        attempts++;
        return importFn().catch(retryError => {
          if (attempts < retryCount) {
            console.log(`Retrying component load (attempt ${attempts + 1})`);
            return new Promise(resolve => {
              setTimeout(() => resolve(retry()), 1000 * attempts);
            });
          }
          throw retryError;
        });
      };
      
      return retry();
    })
  );

  return (props: any) => (
    <Suspense fallback={<FallbackComponent />}>
      <LazyComponent {...props} />
    </Suspense>
  );
};

// Lazy load heavy components with optimized loading
export const LazyMapView = createLazyComponent(
  () => import('./MapView'),
  MapLoader
);

export const LazyRatingModal = createLazyComponent(
  () => import('./RatingModal'),
  MediumLoader
);

export const LazyLocationPanel = createLazyComponent(
  () => import('./LocationPanel'),
  LargeLoader
);

// Lazy load Google Maps wrapper with error handling
export const LazyGoogleMapsWrapper = createLazyComponent(
  () => import('@googlemaps/react-wrapper').then(module => ({ 
    default: module.Wrapper 
  })),
  MapLoader
);

// Preload components for better UX
const preloadComponent = (importFn: () => Promise<any>) => {
  // Preload on idle or after a delay
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      importFn().catch(() => {
        // Silently fail preloading
      });
    });
  } else {
    setTimeout(() => {
      importFn().catch(() => {
        // Silently fail preloading
      });
    }, 2000);
  }
};

// Preload critical components
export const preloadCriticalComponents = () => {
  preloadComponent(() => import('./MapView'));
  preloadComponent(() => import('./LocationPanel'));
  preloadComponent(() => import('@googlemaps/react-wrapper'));
};

// Enhanced component loader with error boundary
export const ComponentLoader = ({ 
  message = 'Loading...',
  size = 'medium' 
}: { 
  message?: string;
  size?: 'small' | 'medium' | 'large';
}) => {
  const LoaderComponent = {
    small: SmallLoader,
    medium: MediumLoader,
    large: LargeLoader
  }[size];

  return (
    <div className="flex items-center justify-center p-4">
      <LoaderComponent />
      {message && <span className="ml-3 text-gray-600">{message}</span>}
    </div>
  );
};

// Error boundary for lazy components
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class LazyComponentErrorBoundary extends Component<
  { 
    children: ReactNode;
    fallback?: ReactNode;
    onError?: (error: Error) => void;
  },
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Lazy component error:', error, errorInfo);
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="p-4 text-center border border-red-200 rounded-lg bg-red-50">
          <p className="text-red-600 mb-2">Failed to load component</p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors"
          >
            Retry
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundary and suspense
export const withLazyLoading = <P extends object>(
  Component: ComponentType<P>,
  FallbackComponent?: ComponentType,
  errorFallback?: ReactNode
) => {
  return (props: P) => (
    <LazyComponentErrorBoundary fallback={errorFallback}>
      <Suspense fallback={FallbackComponent ? <FallbackComponent /> : <MediumLoader />}>
        <Component {...props} />
      </Suspense>
    </LazyComponentErrorBoundary>
  );
};

// Performance monitoring for lazy components
export const trackComponentLoad = (componentName: string) => {
  const startTime = performance.now();
  
  return () => {
    const loadTime = performance.now() - startTime;
    console.log(`Component ${componentName} loaded in ${loadTime.toFixed(2)}ms`);
    
    // Send to analytics if available
    if ('gtag' in window) {
      (window as any).gtag('event', 'component_load', {
        component_name: componentName,
        load_time: Math.round(loadTime)
      });
    }
  };
};

export { SmallLoader, MediumLoader, LargeLoader, MapLoader };
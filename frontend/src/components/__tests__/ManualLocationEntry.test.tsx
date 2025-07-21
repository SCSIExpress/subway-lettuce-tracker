import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ManualLocationEntry } from '../ManualLocationEntry';
import { vi } from 'vitest';

// Mock Google Maps API
const mockGeocoder = {
  geocode: vi.fn(),
};

Object.defineProperty(window, 'google', {
  value: {
    maps: {
      Geocoder: vi.fn(() => mockGeocoder),
    },
  },
  writable: true,
});

describe('ManualLocationEntry', () => {
  const mockOnLocationSet = vi.fn();
  const mockOnCancel = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render when isOpen is false', () => {
    render(
      <ManualLocationEntry
        isOpen={false}
        onLocationSet={mockOnLocationSet}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.queryByText('Enter Your Location')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    render(
      <ManualLocationEntry
        isOpen={true}
        onLocationSet={mockOnLocationSet}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Enter Your Location')).toBeInTheDocument();
    expect(screen.getByText('📍 Address')).toBeInTheDocument();
    expect(screen.getByText('🌐 Coordinates')).toBeInTheDocument();
  });

  it('switches between address and coordinates tabs', () => {
    render(
      <ManualLocationEntry
        isOpen={true}
        onLocationSet={mockOnLocationSet}
        onCancel={mockOnCancel}
      />
    );

    // Initially on address tab
    expect(screen.getByPlaceholderText('e.g., 123 Main St, New York, NY')).toBeInTheDocument();

    // Switch to coordinates tab
    fireEvent.click(screen.getByText('🌐 Coordinates'));
    expect(screen.getByPlaceholderText('40.7128')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('-74.0060')).toBeInTheDocument();

    // Switch back to address tab
    fireEvent.click(screen.getByText('📍 Address'));
    expect(screen.getByPlaceholderText('e.g., 123 Main St, New York, NY')).toBeInTheDocument();
  });

  it('handles address geocoding successfully', async () => {
    mockGeocoder.geocode.mockImplementation((request, callback) => {
      callback([{
        geometry: {
          location: {
            lat: () => 40.7128,
            lng: () => -74.0060,
          },
        },
      }], 'OK');
    });

    render(
      <ManualLocationEntry
        isOpen={true}
        onLocationSet={mockOnLocationSet}
        onCancel={mockOnCancel}
      />
    );

    const addressInput = screen.getByPlaceholderText('e.g., 123 Main St, New York, NY');
    fireEvent.change(addressInput, { target: { value: 'New York, NY' } });

    const findButton = screen.getByText('Find Location');
    fireEvent.click(findButton);

    await waitFor(() => {
      expect(mockOnLocationSet).toHaveBeenCalledWith({ lat: 40.7128, lng: -74.0060 });
    });
  });

  it('handles address geocoding failure', async () => {
    mockGeocoder.geocode.mockImplementation((request, callback) => {
      callback([], 'ZERO_RESULTS');
    });

    render(
      <ManualLocationEntry
        isOpen={true}
        onLocationSet={mockOnLocationSet}
        onCancel={mockOnCancel}
      />
    );

    const addressInput = screen.getByPlaceholderText('e.g., 123 Main St, New York, NY');
    fireEvent.change(addressInput, { target: { value: 'Invalid Address' } });

    const findButton = screen.getByText('Find Location');
    fireEvent.click(findButton);

    await waitFor(() => {
      expect(screen.getByText('Address not found. Please try entering coordinates instead.')).toBeInTheDocument();
    });

    // Should switch to coordinates tab
    expect(screen.getByPlaceholderText('40.7128')).toBeInTheDocument();
  });

  it('handles coordinates input validation', () => {
    render(
      <ManualLocationEntry
        isOpen={true}
        onLocationSet={mockOnLocationSet}
        onCancel={mockOnCancel}
      />
    );

    // Switch to coordinates tab
    fireEvent.click(screen.getByText('🌐 Coordinates'));

    const latInput = screen.getByPlaceholderText('40.7128');
    const lngInput = screen.getByPlaceholderText('-74.0060');
    const setButton = screen.getByText('Set Location');

    // Test invalid coordinates
    fireEvent.change(latInput, { target: { value: 'invalid' } });
    fireEvent.change(lngInput, { target: { value: 'invalid' } });
    fireEvent.click(setButton);

    expect(screen.getByText('Please enter valid numbers for latitude and longitude')).toBeInTheDocument();

    // Test out of range latitude
    fireEvent.change(latInput, { target: { value: '100' } });
    fireEvent.change(lngInput, { target: { value: '0' } });
    fireEvent.click(setButton);

    expect(screen.getByText('Latitude must be between -90 and 90')).toBeInTheDocument();

    // Test out of range longitude
    fireEvent.change(latInput, { target: { value: '0' } });
    fireEvent.change(lngInput, { target: { value: '200' } });
    fireEvent.click(setButton);

    expect(screen.getByText('Longitude must be between -180 and 180')).toBeInTheDocument();
  });

  it('handles valid coordinates submission', () => {
    render(
      <ManualLocationEntry
        isOpen={true}
        onLocationSet={mockOnLocationSet}
        onCancel={mockOnCancel}
      />
    );

    // Switch to coordinates tab
    fireEvent.click(screen.getByText('🌐 Coordinates'));

    const latInput = screen.getByPlaceholderText('40.7128');
    const lngInput = screen.getByPlaceholderText('-74.0060');
    const setButton = screen.getByText('Set Location');

    fireEvent.change(latInput, { target: { value: '40.7128' } });
    fireEvent.change(lngInput, { target: { value: '-74.0060' } });
    fireEvent.click(setButton);

    expect(mockOnLocationSet).toHaveBeenCalledWith({ lat: 40.7128, lng: -74.0060 });
  });

  it('handles cancel action', () => {
    render(
      <ManualLocationEntry
        isOpen={true}
        onLocationSet={mockOnLocationSet}
        onCancel={mockOnCancel}
      />
    );

    // Test close button
    const closeButton = screen.getByLabelText('Close');
    fireEvent.click(closeButton);
    expect(mockOnCancel).toHaveBeenCalled();

    // Reset mock
    mockOnCancel.mockClear();

    // Test cancel button
    const cancelButton = screen.getByText('Cancel');
    fireEvent.click(cancelButton);
    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('disables form submission when address is empty', () => {
    render(
      <ManualLocationEntry
        isOpen={true}
        onLocationSet={mockOnLocationSet}
        onCancel={mockOnCancel}
      />
    );

    const findButton = screen.getByText('Find Location');
    expect(findButton).toBeDisabled();

    const addressInput = screen.getByPlaceholderText('e.g., 123 Main St, New York, NY');
    fireEvent.change(addressInput, { target: { value: 'New York' } });
    expect(findButton).not.toBeDisabled();
  });

  it('disables coordinates submission when fields are empty', () => {
    render(
      <ManualLocationEntry
        isOpen={true}
        onLocationSet={mockOnLocationSet}
        onCancel={mockOnCancel}
      />
    );

    // Switch to coordinates tab
    fireEvent.click(screen.getByText('🌐 Coordinates'));

    const setButton = screen.getByText('Set Location');
    expect(setButton).toBeDisabled();

    const latInput = screen.getByPlaceholderText('40.7128');
    fireEvent.change(latInput, { target: { value: '40.7128' } });
    expect(setButton).toBeDisabled();

    const lngInput = screen.getByPlaceholderText('-74.0060');
    fireEvent.change(lngInput, { target: { value: '-74.0060' } });
    expect(setButton).not.toBeDisabled();
  });

  it('shows loading state during address geocoding', async () => {
    mockGeocoder.geocode.mockImplementation((request, callback) => {
      // Simulate delay
      setTimeout(() => {
        callback([{
          geometry: {
            location: {
              lat: () => 40.7128,
              lng: () => -74.0060,
            },
          },
        }], 'OK');
      }, 100);
    });

    render(
      <ManualLocationEntry
        isOpen={true}
        onLocationSet={mockOnLocationSet}
        onCancel={mockOnCancel}
      />
    );

    const addressInput = screen.getByPlaceholderText('e.g., 123 Main St, New York, NY');
    fireEvent.change(addressInput, { target: { value: 'New York, NY' } });

    const findButton = screen.getByText('Find Location');
    fireEvent.click(findButton);

    expect(screen.getByText('Finding...')).toBeInTheDocument();
    expect(findButton).toBeDisabled();
  });
});
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import WeatherWidget from '../components/WeatherWidget.jsx';

describe('WeatherWidget', () => {
  it('renders nothing when weather is null', () => {
    const { container } = render(<WeatherWidget weather={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('displays temperature and condition', () => {
    const weather = {
      current: {
        temp: 72,
        condition: 'Clear',
        icon: '01d',
        description: 'clear sky',
      },
    };

    render(<WeatherWidget weather={weather} />);

    expect(screen.getByText('72°')).toBeInTheDocument();
    expect(screen.getByText('clear sky')).toBeInTheDocument();
  });

  it('shows correct icon for known conditions', () => {
    const weather = {
      current: {
        temp: 55,
        condition: 'Rain',
        icon: '10d',
        description: 'light rain',
      },
    };

    render(<WeatherWidget weather={weather} />);

    expect(screen.getByText('🌧️')).toBeInTheDocument();
  });

  it('shows fallback icon for unknown conditions', () => {
    const weather = {
      current: {
        temp: 60,
        condition: 'Tornado',
        icon: '50d',
        description: 'tornado',
      },
    };

    render(<WeatherWidget weather={weather} />);

    expect(screen.getByText('🌤️')).toBeInTheDocument();
  });

  it('shows snow icon for snow condition', () => {
    const weather = {
      current: {
        temp: 28,
        condition: 'Snow',
        icon: '13d',
        description: 'heavy snow',
      },
    };

    render(<WeatherWidget weather={weather} />);

    expect(screen.getByText('❄️')).toBeInTheDocument();
  });
});

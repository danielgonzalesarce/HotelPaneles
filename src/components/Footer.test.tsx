import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
import Footer from './Footer';

describe('Footer Component', () => {
  it('should render the hotel name', () => {
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>
    );

    expect(screen.getByText('Lumina Hotel & Spa')).toBeInTheDocument();
  });

  it('should render contact information', () => {
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>
    );

    expect(screen.getByText('+51 1 234 5678')).toBeInTheDocument();
  });

  it('should render navigation links', () => {
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>
    );

    expect(screen.getByText('Inicio')).toBeInTheDocument();
    expect(screen.getByText('Habitaciones')).toBeInTheDocument();
    expect(screen.getByText('Reseñas')).toBeInTheDocument();
    expect(screen.getAllByText('Contacto').length).toBeGreaterThan(0);
  });

  it('should render the Libro de Reclamaciones link', () => {
    render(
      <BrowserRouter>
        <Footer />
      </BrowserRouter>
    );

    expect(screen.getByText('Libro de Reclamaciones')).toBeInTheDocument();
  });
});

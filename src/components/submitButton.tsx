'use client';

import { useFormStatus } from 'react-dom';

export default function SubmitButton() {
  // Este hook sigue siendo el correcto para leer el estado del formulario en el que esté metido
  const { pending } = useFormStatus();

  return (
    <button 
      type="submit" 
      disabled={pending} 
      className="btn btn-primary" 
      style={{ 
        width: '100%', 
        padding: '0.75rem', 
        fontSize: '1rem', 
        fontWeight: 700, 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center',
        gap: '8px',
        opacity: pending ? 0.7 : 1,
        cursor: pending ? 'not-allowed' : 'pointer'
      }}
    >
      {pending ? (
        <>
          <i className="fas fa-circle-notch fa-spin"></i> Entrando...
        </>
      ) : (
        <>
          <i className="fas fa-sign-in-alt"></i> Entrar
        </>
      )}
    </button>
  );
}
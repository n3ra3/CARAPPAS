import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || 'Неизвестная ошибка интерфейса'
    };
  }

  componentDidCatch(error, errorInfo) {
    console.error('UI Error Boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem' }}>
          <h2 style={{ marginBottom: '0.75rem' }}>Ошибка интерфейса</h2>
          <p style={{ marginBottom: '1rem', color: 'var(--text-secondary)' }}>
            Страница столкнулась с ошибкой и не может быть отображена.
          </p>
          <div className="alert alert-error">
            {this.state.errorMessage}
          </div>
          <button
            className="btn btn-primary"
            style={{ marginTop: '1rem' }}
            onClick={() => window.location.reload()}
          >
            Перезагрузить страницу
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

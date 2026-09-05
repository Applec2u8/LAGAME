import { Component, type ReactNode } from 'react'

type Props = { children: ReactNode }
type State = { error: Error | null }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{
          minHeight: '100vh', display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          background: '#080810', color: '#fff', padding: 32, fontFamily: 'monospace'
        }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>💥</div>
          <h1 style={{ fontSize: 22, marginBottom: 12, color: '#ef4444' }}>Runtime Error</h1>
          <pre style={{
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: 12, padding: 20, maxWidth: 700, width: '100%',
            whiteSpace: 'pre-wrap', fontSize: 13, color: '#fca5a5', lineHeight: 1.6
          }}>
            {this.state.error.message}
            {'\n\n'}
            {this.state.error.stack}
          </pre>
        </div>
      )
    }
    return this.props.children
  }
}

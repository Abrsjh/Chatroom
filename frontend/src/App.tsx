import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Layout, Login, Register } from './components'
import { ProtectedRoute } from './components/ProtectedRoute'
import { UserProvider } from './contexts/UserContext'
import { ChannelsPage, CreatePostPage, ChannelViewPage, PostViewPage } from './pages'
import { useMockData } from './hooks/useMockData'

function App() {
  // Load mock data for development
  useMockData()

  return (
    <BrowserRouter>
      <UserProvider>
        <Routes>
          {/* Public routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Protected routes */}
          <Route path="/" element={
            <ProtectedRoute>
              <Layout>
                <div className="app-content">
                  <h2>Welcome to Reddit Forum</h2>
                  <p>Navigate to channels using the sidebar or visit <a href="/channels">/channels</a></p>
                  <p>Create a new post at <a href="/create-post">/create-post</a></p>
                </div>
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/channels" element={
            <ProtectedRoute>
              <Layout>
                <ChannelsPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/channels/:id" element={
            <ProtectedRoute>
              <Layout>
                <ChannelViewPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/posts/:id" element={
            <ProtectedRoute>
              <Layout>
                <PostViewPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/create-post" element={
            <ProtectedRoute>
              <Layout>
                <CreatePostPage />
              </Layout>
            </ProtectedRoute>
          } />
          
          <Route path="/messages" element={
            <ProtectedRoute>
              <Layout>
                <div>
                  <h2>Messages</h2>
                  <p>Direct messages will be implemented later</p>
                </div>
              </Layout>
            </ProtectedRoute>
          } />
        </Routes>
      </UserProvider>
    </BrowserRouter>
  )
}

export default App
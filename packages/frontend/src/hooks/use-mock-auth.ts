import { useAuth } from "@/contexts/auth-context"
import { useEffect } from "react"

export function useMockAuth() {
  const { user, login } = useAuth()

  useEffect(() => {
    // For demo purposes, automatically log in a mock user if not logged in
    if (!user) {
      const mockUser = {
        node_id: 1,
        public: {
          name: "Demo User",
          email: "demo@rmjac.com",
          iden: "demo_user",
          creation_time: new Date().toISOString(),
          last_login_time: new Date().toISOString(),
          avatar: "https://avatars.githubusercontent.com/u/1?v=4"
        }
      }
      const mockToken = "mock_token_12345"

      // Auto-login for demo
      login(mockUser, mockToken)
    }
  }, [user, login])

  return { user }
}
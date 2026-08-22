import { RouterProvider } from "react-router-dom"
import { router } from "@/routes"
import QueryProvider from "@/components/common/QueryProvider"

function App() {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
    </QueryProvider>
  )
}

export default App

import { RouterProvider } from "react-router-dom"
import { router } from "@/routes"
import QueryProvider from "@/components/common/QueryProvider"
import { Toaster } from "@/components/common/Toaster"

function App() {
  return (
    <QueryProvider>
      <RouterProvider router={router} />
      <Toaster />
    </QueryProvider>
  )
}

export default App

import { useMemo } from "react";
import { Thread } from "./components/assistant-ui/thread"
import { MyRuntimeProvider } from "./contexts/RuntimeProvider"
import { v4 as uuidv4 } from 'uuid';
function App() {
  const threadId = useMemo(() => uuidv4(), []);
  return (
    <div className="h-screen w-screen">
    <MyRuntimeProvider ThreadId={threadId}>
    <Thread />
   </MyRuntimeProvider>
   </div>
  )
}

export default App

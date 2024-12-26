import { Button } from '@/components/ui/button'
import { Trash2 } from 'lucide-react'

export function Sidebar({ chats, currentChat, setCurrentChat, createNewChat, deleteChat }) {
  return (
    <div className="w-64 bg-secondary p-4">
      <Button onClick={createNewChat} className="w-full mb-4">New Chat</Button>
      {chats.map((chat) => (
        <div
          key={chat.id}
          className={`p-2 cursor-pointer rounded flex justify-between items-center ${currentChat?.id === chat.id ? 'bg-primary text-primary-foreground' : 'hover:bg-secondary-foreground/10'}`}
        >
          <div onClick={() => setCurrentChat(chat)} className="flex-1 truncate">
            {chat.name}
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => deleteChat(chat.id)}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
    </div>
  )
}


'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Sidebar } from '@/components/Sidebar'
import { ChatMessage } from '@/components/ChatMessage'
import { ModelSelector } from '@/components/ModelSelector'
import { Upload, LogOut, Trash2 } from 'lucide-react'
import { toast } from '@/components/ui/use-toast'
import { RedPillAPI } from '@/lib/redpill-api'

const redPillAPI = new RedPillAPI(process.env.NEXT_PUBLIC_REDPILL_API_KEY);

export default function ChatPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [chats, setChats] = useState([])
  const [currentChat, setCurrentChat] = useState(null)
  const [input, setInput] = useState('')
  const [messages, setMessages] = useState([])
  const [model, setModel] = useState('')
  const [availableModels, setAvailableModels] = useState([])
  const [isLoadingModels, setIsLoadingModels] = useState(true)
  const [file, setFile] = useState(null)
  const fileInputRef = useRef(null)
  const messagesEndRef = useRef(null)

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login')
    } else if (status === 'authenticated') {
      fetchChats()
      fetchModels()
    }
  }, [status])

  useEffect(() => {
    if (currentChat) {
      fetchMessages(currentChat.id)
    }
  }, [currentChat])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const fetchModels = async () => {
    try {
      setIsLoadingModels(true)
      const models = await redPillAPI.getModels()
      setAvailableModels(models)
      if (models.length > 0) {
        setModel(models[0].id)
      }
    } catch (error) {
      console.error('Error fetching models:', error)
      toast({
        title: "Error",
        description: "Failed to fetch available models",
        variant: "destructive",
      })
    } finally {
      setIsLoadingModels(false)
    }
  }

  const fetchChats = async () => {
    try {
      const response = await fetch('/api/chats')
      if (!response.ok) throw new Error('Failed to fetch chats')
      const data = await response.json()
      setChats(data)
      if (data.length > 0) setCurrentChat(data[0])
    } catch (error) {
      console.error('Error fetching chats:', error)
      toast({
        title: "Error",
        description: "Failed to fetch chats",
        variant: "destructive",
      })
    }
  }

  const fetchMessages = async (chatId) => {
    try {
      const response = await fetch(`/api/chat/${chatId}`)
      if (!response.ok) throw new Error('Failed to fetch messages')
      const data = await response.json()
      setMessages(data)
    } catch (error) {
      console.error('Error fetching messages:', error)
      toast({
        title: "Error",
        description: "Failed to fetch messages",
        variant: "destructive",
      })
    }
  }

  const createNewChat = async () => {
    try {
      const response = await fetch('/api/chats', { method: 'POST' })
      if (!response.ok) throw new Error('Failed to create new chat')
      const newChat = await response.json()
      setChats([newChat, ...chats])
      setCurrentChat(newChat)
      setMessages([])
    } catch (error) {
      console.error('Error creating new chat:', error)
      toast({
        title: "Error",
        description: "Failed to create new chat",
        variant: "destructive",
      })
    }
  }

  const deleteChat = async (chatId) => {
    try {
      const response = await fetch(`/api/chats/${chatId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete chat')
      setChats(chats.filter(chat => chat.id !== chatId))
      if (currentChat.id === chatId) {
        setCurrentChat(chats[0] || null)
        setMessages([])
      }
      toast({
        title: "Success",
        description: "Chat deleted successfully",
      })
    } catch (error) {
      console.error('Error deleting chat:', error)
      toast({
        title: "Error",
        description: "Failed to delete chat",
        variant: "destructive",
      })
    }
  }

  const sendMessage = async () => {
    if (!input.trim()) return

    const newMessage = { role: 'user', content: input }
    setMessages([...messages, newMessage])
    setInput('')

    try {
      const response = await fetch(`/api/chat/${currentChat.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: input, model }),
      })

      if (!response.ok) throw new Error('Failed to send message')

      const aiResponse = await response.json()
      setMessages([...messages, newMessage, aiResponse])
    } catch (error) {
      console.error('Error sending message:', error)
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      })
    }
  }

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
  }

  const uploadFile = async () => {
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    try {
      const response = await fetch('/api/upload',{
        method: 'POST',
        body: formData,
      })

      if (!response.ok) throw new Error('Failed to upload file')

      const attachment = await response.json()
      toast({
        title: "Success",
        description: "File uploaded successfully",
      })
      setFile(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    } catch (error) {
      console.error('Error uploading file:', error)
      toast({
        title: "Error",
        description: "Failed to upload file",
        variant: "destructive",
      })
    }
  }

  const handleLogout = async () => {
    await signOut({ redirect: false })
    router.push('/login')
  }

  return (
    <div className="flex h-screen bg-background text-foreground">
      <Sidebar 
        chats={chats} 
        currentChat={currentChat} 
        setCurrentChat={setCurrentChat} 
        createNewChat={createNewChat}
        deleteChat={deleteChat}
      />
      <div className="flex-1 flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h1 className="text-2xl font-bold">Krishnaco AI</h1>
          <Button onClick={handleLogout} variant="ghost">
            <LogOut className="mr-2 h-4 w-4" /> Logout
          </Button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map((message, index) => (
            <ChatMessage key={index} message={message} />
          ))}
          <div ref={messagesEndRef} />
        </div>
        <div className="p-4 border-t">
          <ModelSelector 
            model={model} 
            setModel={setModel} 
            availableModels={availableModels}
            isLoading={isLoadingModels}
          />
          <div className="flex mt-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type your message..."
              className="flex-1 mr-2"
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            />
            <Button onClick={sendMessage}>Send</Button>
          </div>
          <div className="flex mt-2">
            <Input
              type="file"
              onChange={handleFileChange}
              ref={fileInputRef}
              className="flex-1 mr-2"
            />
            <Button onClick={uploadFile} disabled={!file}>
              <Upload className="mr-2 h-4 w-4" /> Upload
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}


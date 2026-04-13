import React, { useState } from 'react';
import { UserProfile, AIProvider } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Settings, User, Shield, Sparkles } from 'lucide-react';

interface ProfileSettingsProps {
  profile: UserProfile;
  onUpdate: (profile: UserProfile) => void;
}

export function ProfileSettings({ profile, onUpdate }: ProfileSettingsProps) {
  const [formData, setFormData] = useState<UserProfile>(profile);

  const handleSave = () => {
    onUpdate(formData);
  };

  return (
    <Dialog>
      <DialogTrigger render={<Button variant="ghost" size="icon" className="h-9 w-9 text-muted-foreground hover:text-foreground" />}>
        <Settings className="w-5 h-5" />
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] bg-card border-border flex flex-col max-h-[90vh] p-0">
        <div className="p-6 pb-0">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-foreground">
              <Settings className="w-5 h-5" />
              Settings & Profile
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Manage your profile, AI providers, and application preferences.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-6 px-6 py-4 overflow-y-auto flex-1">
          {/* Profile Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <User className="w-4 h-4" />
              Personal Information
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-foreground">Display Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="bg-background"
                />
              </div>
            </div>
          </div>

          {/* AI Providers Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Sparkles className="w-4 h-4" />
              AI Model Providers
            </div>
            <div className="space-y-3">
              <div className="space-y-2">
                <Label className="text-foreground">Default Provider</Label>
                <Select
                  value={formData.preferences.defaultProvider}
                  onValueChange={(value: AIProvider) => 
                    setFormData({
                      ...formData,
                      preferences: { ...formData.preferences, defaultProvider: value }
                    })
                  }
                >
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder="Select a provider" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gemini">Google Gemini (Default)</SelectItem>
                    <SelectItem value="openai">OpenAI (ChatGPT)</SelectItem>
                    <SelectItem value="claude">Anthropic (Claude)</SelectItem>
                    <SelectItem value="groq">Groq (Ultra Fast)</SelectItem>
                    <SelectItem value="mistral">Mistral AI</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="openai-key" className="text-foreground">OpenAI API Key</Label>
                <Input
                  id="openai-key"
                  type="password"
                  placeholder="sk-..."
                  value={formData.preferences.apiKeys.openai || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    preferences: {
                      ...formData.preferences,
                      apiKeys: { ...formData.preferences.apiKeys, openai: e.target.value }
                    }
                  })}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="claude-key" className="text-foreground">Claude API Key</Label>
                <Input
                  id="claude-key"
                  type="password"
                  placeholder="sk-ant-..."
                  value={formData.preferences.apiKeys.claude || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    preferences: {
                      ...formData.preferences,
                      apiKeys: { ...formData.preferences.apiKeys, claude: e.target.value }
                    }
                  })}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="groq-key" className="text-foreground">Groq API Key</Label>
                <Input
                  id="groq-key"
                  type="password"
                  placeholder="gsk_..."
                  value={formData.preferences.apiKeys.groq || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    preferences: {
                      ...formData.preferences,
                      apiKeys: { ...formData.preferences.apiKeys, groq: e.target.value }
                    }
                  })}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="mistral-key" className="text-foreground">Mistral API Key</Label>
                <Input
                  id="mistral-key"
                  type="password"
                  placeholder="Mistral API Key"
                  value={formData.preferences.apiKeys.mistral || ''}
                  onChange={(e) => setFormData({
                    ...formData,
                    preferences: {
                      ...formData.preferences,
                      apiKeys: { ...formData.preferences.apiKeys, mistral: e.target.value }
                    }
                  })}
                  className="bg-background"
                />
              </div>
              <p className="text-[10px] text-muted-foreground italic">
                Note: API keys are stored locally in your browser.
              </p>
            </div>
          </div>

          {/* Preferences Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Shield className="w-4 h-4" />
              Preferences
            </div>
            <div className="space-y-2">
              <Label className="text-foreground">Theme</Label>
              <Select
                value={formData.preferences.theme}
                onValueChange={(value: 'light' | 'dark' | 'system') => 
                  setFormData({
                    ...formData,
                    preferences: { ...formData.preferences, theme: value }
                  })
                }
              >
                <SelectTrigger className="bg-background">
                  <SelectValue placeholder="Select theme" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Light</SelectItem>
                  <SelectItem value="dark">Dark</SelectItem>
                  <SelectItem value="system">System</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <div className="mt-auto border-t bg-muted/50 p-4 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end rounded-b-xl">
          <Button variant="outline" onClick={() => setFormData(profile)}>Reset</Button>
          <Button onClick={handleSave} className="bg-primary text-primary-foreground hover:bg-primary/90">
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

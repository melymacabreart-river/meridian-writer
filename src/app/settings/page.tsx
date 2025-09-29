'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Eye, EyeOff, Save, TestTube } from 'lucide-react';

export default function SettingsPage() {
  const [apiKeys, setApiKeys] = useState({
    anthropic: '',
    together: '',
    openai: ''
  });

  const [showKeys, setShowKeys] = useState({
    anthropic: false,
    together: false,
    openai: false
  });

  const [testResults, setTestResults] = useState({
    anthropic: null as boolean | null,
    together: null as boolean | null,
    openai: null as boolean | null
  });

  const [preferences, setPreferences] = useState({
    defaultProvider: 'anthropic',
    enableMemory: true,
    memoryRetention: 'unlimited',
    autoSave: true,
    enableCompanionLearning: true
  });

  const handleApiKeyChange = (provider: string, value: string) => {
    setApiKeys(prev => ({ ...prev, [provider]: value }));
    setTestResults(prev => ({ ...prev, [provider]: null }));
  };

  const toggleKeyVisibility = (provider: string) => {
    setShowKeys(prev => ({ ...prev, [provider]: !prev[provider as keyof typeof prev] }));
  };

  const testApiKey = async (provider: string) => {
    const key = apiKeys[provider as keyof typeof apiKeys];
    if (!key) return;

    try {
      // This would be replaced with actual API testing
      console.log(`Testing ${provider} API key...`);
      
      // Simulate API test
      setTimeout(() => {
        setTestResults(prev => ({ ...prev, [provider]: Math.random() > 0.2 }));
      }, 1000);
    } catch (error) {
      setTestResults(prev => ({ ...prev, [provider]: false }));
    }
  };

  const saveSettings = async () => {
    try {
      // Save to database
      console.log('Saving settings...', { apiKeys, preferences });
      // This would make an API call to save encrypted keys and preferences
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Settings
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Configure your AI providers and preferences
          </p>
        </div>

        <Tabs defaultValue="api-keys" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="api-keys">API Keys</TabsTrigger>
            <TabsTrigger value="preferences">Preferences</TabsTrigger>
            <TabsTrigger value="usage">Usage & Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="api-keys">
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">AI Provider API Keys</h3>
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
                  Add your API keys to use different AI providers. Keys are encrypted and stored securely.
                </p>

                <div className="space-y-6">
                  {/* Anthropic */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="anthropic-key">Anthropic (Claude)</Label>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testApiKey('anthropic')}
                          disabled={!apiKeys.anthropic}
                        >
                          <TestTube className="h-4 w-4 mr-2" />
                          Test
                        </Button>
                        {testResults.anthropic !== null && (
                          <span className={`text-xs ${testResults.anthropic ? 'text-green-600' : 'text-red-600'}`}>
                            {testResults.anthropic ? '✓ Valid' : '✗ Invalid'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <Input
                        id="anthropic-key"
                        type={showKeys.anthropic ? 'text' : 'password'}
                        placeholder="sk-ant-api..."
                        value={apiKeys.anthropic}
                        onChange={(e) => handleApiKeyChange('anthropic', e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                        onClick={() => toggleKeyVisibility('anthropic')}
                      >
                        {showKeys.anthropic ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* Together AI */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="together-key">Together AI</Label>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testApiKey('together')}
                          disabled={!apiKeys.together}
                        >
                          <TestTube className="h-4 w-4 mr-2" />
                          Test
                        </Button>
                        {testResults.together !== null && (
                          <span className={`text-xs ${testResults.together ? 'text-green-600' : 'text-red-600'}`}>
                            {testResults.together ? '✓ Valid' : '✗ Invalid'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <Input
                        id="together-key"
                        type={showKeys.together ? 'text' : 'password'}
                        placeholder="together-api-key..."
                        value={apiKeys.together}
                        onChange={(e) => handleApiKeyChange('together', e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                        onClick={() => toggleKeyVisibility('together')}
                      >
                        {showKeys.together ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>

                  <Separator />

                  {/* OpenAI */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="openai-key">OpenAI</Label>
                      <div className="flex items-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => testApiKey('openai')}
                          disabled={!apiKeys.openai}
                        >
                          <TestTube className="h-4 w-4 mr-2" />
                          Test
                        </Button>
                        {testResults.openai !== null && (
                          <span className={`text-xs ${testResults.openai ? 'text-green-600' : 'text-red-600'}`}>
                            {testResults.openai ? '✓ Valid' : '✗ Invalid'}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="relative">
                      <Input
                        id="openai-key"
                        type={showKeys.openai ? 'text' : 'password'}
                        placeholder="sk-..."
                        value={apiKeys.openai}
                        onChange={(e) => handleApiKeyChange('openai', e.target.value)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="absolute right-2 top-1/2 transform -translate-y-1/2"
                        onClick={() => toggleKeyVisibility('openai')}
                      >
                        {showKeys.openai ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>

                <Button onClick={saveSettings} className="w-full mt-6">
                  <Save className="h-4 w-4 mr-2" />
                  Save API Keys
                </Button>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="preferences">
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">AI & Memory Preferences</h3>
                
                <div className="space-y-6">
                  <div>
                    <Label htmlFor="default-provider">Default AI Provider</Label>
                    <select
                      id="default-provider"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                      value={preferences.defaultProvider}
                      onChange={(e) => setPreferences(prev => ({ ...prev, defaultProvider: e.target.value }))}
                    >
                      <option value="anthropic">Anthropic (Claude)</option>
                      <option value="together">Together AI</option>
                      <option value="openai">OpenAI</option>
                    </select>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Enable Memory System</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Allow companions and writing assistants to remember conversations and context
                      </p>
                    </div>
                    <Switch
                      checked={preferences.enableMemory}
                      onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, enableMemory: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Companion Learning</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Allow companions to learn and adapt to your preferences over time
                      </p>
                    </div>
                    <Switch
                      checked={preferences.enableCompanionLearning}
                      onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, enableCompanionLearning: checked }))}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label>Auto-Save Documents</Label>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        Automatically save your work as you write
                      </p>
                    </div>
                    <Switch
                      checked={preferences.autoSave}
                      onCheckedChange={(checked) => setPreferences(prev => ({ ...prev, autoSave: checked }))}
                    />
                  </div>

                  <div>
                    <Label htmlFor="memory-retention">Memory Retention</Label>
                    <select
                      id="memory-retention"
                      className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                      value={preferences.memoryRetention}
                      onChange={(e) => setPreferences(prev => ({ ...prev, memoryRetention: e.target.value }))}
                    >
                      <option value="unlimited">Unlimited (Permanent)</option>
                      <option value="1year">1 Year</option>
                      <option value="6months">6 Months</option>
                      <option value="3months">3 Months</option>
                      <option value="1month">1 Month</option>
                    </select>
                  </div>
                </div>

                <Button onClick={saveSettings} className="w-full mt-6">
                  <Save className="h-4 w-4 mr-2" />
                  Save Preferences
                </Button>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="usage">
            <div className="space-y-6">
              <Card className="p-6">
                <h3 className="text-lg font-semibold mb-4">API Usage & Analytics</h3>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  Track your token usage and costs across different AI providers.
                </p>
                
                <div className="text-center py-8">
                  <p className="text-gray-500 dark:text-gray-400">
                    Usage analytics will appear here once you start using the app.
                  </p>
                </div>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
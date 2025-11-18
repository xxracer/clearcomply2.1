
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Building, Save, PlusCircle, Trash2, Loader2, Workflow, Edit, Upload, Wand2, Library, Eye, Info, ArrowRight, Link as LinkIcon, File as FileIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useTransition } from "react";
import Image from "next/image";
import { getCompanies, createOrUpdateCompany } from "@/app/actions/company-actions";
import { type Company, type OnboardingProcess, requiredDocSchema, type RequiredDoc, type ApplicationForm as AppFormType } from "@/lib/company-schemas";
import { getFile, uploadKvFile, deleteFile } from "@/app/actions/kv-actions";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { generateIdForServer } from "@/lib/server-utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Link from "next/link";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { AiFormBuilderDialog } from "@/components/dashboard/settings/ai-form-builder-dialog";
import { Textarea } from "@/components/ui/textarea";
import { generateForm } from "@/ai/flows/generate-form-flow";
import { AiFormField } from "@/lib/company-schemas";


// Main component for the settings page
export default function SettingsPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [company, setCompany] = useState<Partial<Company>>({});
  const [logoFile, setLogoFile] = useState<File | undefined>();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // AI Form Builder state
  const [isAiBuilderOpen, setIsAiBuilderOpen] = useState(false);
  const [aiBuilderMode, setAiBuilderMode] = useState<'wizard' | 'prompt'>('wizard');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // State for alert dialogs
  const [isCompanyDetailsDialogOpen, setCompanyDetailsDialogOpen] = useState(false);
  const [isPreviewDialogOpen, setIsPreviewDialogOpen] = useState(false);

  const [isAiBuilderInfoOpen, setIsAiBuilderInfoOpen] = useState(false);


  const showCompanyDetailsHint = !company.name;
  const showAiBuilderHint = !company.name;


  // Load initial company data
  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      const companies = await getCompanies();
      const firstCompany = companies[0] || {};
      
      if (!firstCompany.onboardingProcesses || firstCompany.onboardingProcesses.length === 0) {
          firstCompany.onboardingProcesses = [{
              id: generateIdForServer(),
              name: "Default Process",
              applicationForm: { id: generateIdForServer(), name: "Default Template Form", type: 'template', images: [], fields: [] },
              interviewScreen: { type: 'template' },
              requiredDocs: [],
          }];
      }

      setCompany(firstCompany);
      if (firstCompany.logo) {
        try {
          const url = await getFile(firstCompany.logo);
          setLogoPreview(url);
        } catch (e) {
          console.error("Failed to load logo", e);
          setLogoPreview(null);
        }
      }
      setIsLoading(false);
    }
    loadInitialData();
  }, []);

  const handleFieldChange = (field: keyof Company, value: any) => {
    setCompany(prev => ({ ...prev, [field]: value }));
  };
  
  const handleAddNewProcess = (name: string, fields: AiFormField[]) => {
      const newProcess: OnboardingProcess = {
          id: generateIdForServer(),
          name: name,
          applicationForm: { id: generateIdForServer(), name: name, type: 'custom', images: [], fields: fields },
          interviewScreen: { type: 'template' },
          requiredDocs: [],
      };
      const updatedProcesses = [...(company.onboardingProcesses || []), newProcess];
      handleFieldChange('onboardingProcesses', updatedProcesses);
  };
  
    const handleGenerateFromPrompt = async () => {
        if (!prompt) {
            toast({ variant: 'destructive', title: 'Prompt is empty', description: 'Please describe the form you want to create.' });
            return;
        }
        setIsGenerating(true);
        try {
            const result = await generateForm({ prompt });
            handleAddNewProcess(result.formName, result.fields);
            toast({
                title: 'Form Generated!',
                description: `"${result.formName}" has been added. Don't forget to save your changes.`,
            });
            setPrompt('');
        } catch (error) {
            toast({ variant: 'destructive', title: 'Generation Failed', description: (error as Error).message });
        } finally {
            setIsGenerating(false);
        }
    };


  const handleSave = () => {
    startTransition(async () => {
      if (!company.name) {
        toast({ variant: 'destructive', title: "Validation Error", description: "Company name is required." });
        return;
      }
      
      try {
        let dataToSave = { ...company };
        
        if (logoFile) {
          const logoKey = `logo-${dataToSave.name?.replace(/\s+/g, '-')}-${Date.now()}`;
          if (dataToSave.logo) {
            await deleteFile(dataToSave.logo);
          }
          dataToSave.logo = await uploadKvFile(logoFile, logoKey);
        }

        const result = await createOrUpdateCompany(dataToSave);
        if (!result.success || !result.company) throw new Error(result.error || "Failed to save.");

        toast({ title: "Settings Saved", description: "Company details have been updated." });
        setCompany(result.company);
        setLogoFile(undefined);

      } catch (error) {
        toast({ variant: "destructive", title: "Save Failed", description: (error as Error).message });
      }
    });
  };

  const [activeProcessId, setActiveProcessId] = useState<string | null>(company.onboardingProcesses?.[0]?.id || null);

  useEffect(() => {
    if (!activeProcessId && company.onboardingProcesses && company.onboardingProcesses.length > 0) {
      setActiveProcessId(company.onboardingProcesses[0].id);
    }
  }, [company.onboardingProcesses, activeProcessId]);

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-10">
        <Loader2 className="h-12 w-12 text-muted-foreground animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-8 w-8 text-foreground" />
          <div>
            <h1 className="text-3xl font-headline font-bold text-foreground">System Settings</h1>
            <p className="text-muted-foreground">Manage company profile and onboarding processes.</p>
          </div>
        </div>
      </div>
      
      <Card>
          <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                  <Building className="h-5 w-5" />
                  <CardTitle className="text-xl">Company Details</CardTitle>
              </div>
          </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4 relative">
            <CardDescription className="mb-6">Manage the company profile and associated onboarding users. Remember to save your changes.</CardDescription>
            <fieldset className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="company-name">Company Name</Label>
                  <Input id="company-name" placeholder="e.g., Noble Health" value={company.name || ''} onChange={(e) => handleFieldChange('name', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-address">Address</Label>
                  <Input id="company-address" placeholder="123 Main St, Anytown, USA" value={company.address || ''} onChange={(e) => handleFieldChange('address', e.target.value)} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <Label htmlFor="company-phone">Phone Number</Label>
                      <Input id="company-phone" placeholder="(555) 123-4567" value={company.phone || ''} onChange={(e) => handleFieldChange('phone', e.target.value)} />
                  </div>
                   <div className="space-y-2">
                      <Label htmlFor="company-fax">Fax</Label>
                      <Input id="company-fax" placeholder="(555) 123-4568" value={company.fax || ''} onChange={(e) => handleFieldChange('fax', e.target.value)} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="company-email">Company Email</Label>
                  <Input id="company-email" type="email" placeholder="contact@noblehealth.com" value={company.email || ''} onChange={(e) => handleFieldChange('email', e.target.value)} />
                </div>
                <div className="space-y-2">
                    <Label htmlFor="company-logo">Company Logo</Label>
                    <div className="flex items-center gap-4">
                        <Input id="company-logo" type="file" className="max-w-xs" onChange={(e) => { if (e.target.files) setLogoFile(e.target.files[0])}} accept="image/*" />
                        {logoPreview && <Image src={logoPreview} alt="Logo Preview" width={40} height={40} className="rounded-sm object-contain" />}
                    </div>
                </div>
              </div>
              <div className="space-y-4 rounded-md border p-4 bg-muted/30">
                <h3 className="font-semibold text-foreground">Onboarding Users</h3>
                <div className="space-y-2">
                  <Label htmlFor="user-name">User Name</Label>
                  <Input id="user-name" placeholder="e.g., John Doe" disabled />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="user-role">Role</Label>
                  <Input id="user-role" placeholder="e.g., HR Manager" disabled />
                </div>
                 <div className="space-y-2">
                  <Label htmlFor="user-email">Email</Label>
                  <Input id="user-email" type="email" placeholder="e.g., john.doe@company.com" disabled />
                </div>
                <Button className="w-full" disabled><PlusCircle className="mr-2 h-4 w-4" /> Add User</Button>
              </div>
            </fieldset>
            <div className="mt-6">
              <Button size="lg" disabled={isPending} onClick={handleSave}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Company & Continue
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Library className="h-5 w-5" />
                    <CardTitle className="text-xl">Form Library</CardTitle>
                </div>
            </div>
            <CardDescription>Manage your saved application forms and onboarding processes.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Form List */}
          <div className="md:col-span-1 space-y-2">
            <h3 className="font-semibold px-2">Available Forms</h3>
            <div className="flex flex-col gap-1">
              {(company.onboardingProcesses || []).filter(p => p.id === company.onboardingProcesses?.[0]?.id).map(p => (
                 <Button
                    key={p.id}
                    variant={"secondary"}
                    className="justify-start"
                 >
                    {p.name}
                 </Button>
              ))}
              <Button variant="ghost" className="justify-start text-muted-foreground" disabled>Custom Form 2 <span className="text-xs ml-auto">(Available soon)</span></Button>
              <Button variant="ghost" className="justify-start text-muted-foreground" disabled>Custom Form 3 <span className="text-xs ml-auto">(Available soon)</span></Button>
              <Button variant="ghost" className="justify-start text-muted-foreground" disabled>Custom Form 4 <span className="text-xs ml-auto">(Available soon)</span></Button>
            </div>
          </div>

          {/* Right Column: Form Editor */}
          <div className="md:col-span-2 border rounded-lg p-4 space-y-6">
             <div className="flex items-center justify-between">
                <p className="font-semibold">{company.onboardingProcesses?.[0]?.name || 'Default Process'}</p>
                <Button variant="outline" asChild>
                    <Link href="/dashboard/settings/preview/application" target="_blank">
                    <Eye className="mr-2 h-4 w-4" />
                    Preview Form
                    </Link>
                </Button>
             </div>
             <p className="text-sm text-muted-foreground">This is the default template form. To create custom forms, use the AI Process Builder below.</p>
          </div>
        </CardContent>
      </Card>


      <Card>
          <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl">AI-Powered Process Builder</CardTitle>
              </div>
               {showAiBuilderHint && (
                  <div className="flex items-center gap-2 text-primary animate-pulse">
                        <AlertDialog open={isAiBuilderInfoOpen} onOpenChange={setIsAiBuilderInfoOpen}>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7"><Info className="h-5 w-5 text-muted-foreground" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>About the AI Process Builder</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        Use AI to quickly generate new onboarding processes. You can use the guided wizard for a step-by-step approach or write a free-form prompt for more custom needs.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogAction onClick={() => {}}>Got it!</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                  </div>
              )}
          </CardHeader>
        <fieldset disabled={showAiBuilderHint}>
        <CardContent className="space-y-6">
             <RadioGroup value={aiBuilderMode} onValueChange={(v) => setAiBuilderMode(v as 'wizard' | 'prompt')} className="flex items-center gap-4">
                <div className="flex items-center space-x-2"><RadioGroupItem value="wizard" id="wizard" /><Label htmlFor="wizard">Guided Wizard</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="prompt" id="prompt" /><Label htmlFor="prompt">Free-form Prompt</Label></div>
            </RadioGroup>

            {aiBuilderMode === 'wizard' ? (
                <div>
                    <p className="text-sm text-muted-foreground mb-4">A step-by-step guide to create a new form by answering questions.</p>
                    <Button onClick={() => setIsAiBuilderOpen(true)}>
                        <Wand2 className="mr-2 h-4 w-4" />
                        Start Wizard
                    </Button>
                </div>
            ) : (
                <div className="space-y-6">
                    {/* Phase 1 */}
                    <div className="p-4 border rounded-lg space-y-3">
                         <div className="flex items-center justify-between">
                            <Label htmlFor="prompt-p1" className="font-semibold">Phase 1: Application Form</Label>
                        </div>
                        <Textarea id="prompt-p1" placeholder="Describe the application form you need..." value={prompt} onChange={(e) => setPrompt(e.target.value)} />
                        <Button onClick={handleGenerateFromPrompt} disabled={isGenerating}>
                            {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Generate Form
                        </Button>
                    </div>

                     {/* Phase 2 */}
                    <div className="p-4 border rounded-lg space-y-3 opacity-50">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label htmlFor="prompt-p2" className="font-semibold">Phase 2: Interview Screen</Label>
                                <p className="text-xs text-amber-600 font-semibold">Available soon</p>
                            </div>
                        </div>
                        <Textarea id="prompt-p2" placeholder="Describe the interview questions or screen..." disabled />
                        <Button disabled>Generate</Button>
                    </div>

                     {/* Phase 3 */}
                    <div className="p-4 border rounded-lg space-y-3 opacity-50">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label htmlFor="prompt-p3" className="font-semibold">Phase 3: Required Documentation</Label>
                                <p className="text-xs text-amber-600 font-semibold">Available soon</p>
                            </div>
                        </div>
                        <Textarea id="prompt-p3" placeholder="List the required documents..." disabled />
                        <Button disabled>Generate</Button>
                    </div>
                </div>
            )}
             <AiFormBuilderDialog 
                isOpen={isAiBuilderOpen} 
                onOpenChange={setIsAiBuilderOpen}
                companyName={company.name}
                onFormGenerated={(name, fields) => {
                    handleAddNewProcess(name, fields);
                    toast({
                        title: "AI Form Created!",
                        description: `"${name}" has been added. Remember to save your changes.`
                    });
                }}
             />
        </CardContent>
        </fieldset>
      </Card>

      {/* NEW SECTION FOR AI FORMS */}
      <Card>
        <CardHeader>
          <CardTitle>Your IA Forms</CardTitle>
          <CardDescription>
            Forms created by the AI will appear here. Remember to save your settings to persist them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(company.onboardingProcesses || []).filter(p => p.id !== company.onboardingProcesses?.[0]?.id).map(process => (
              <div key={process.id} className="flex items-center justify-between p-3 rounded-md border bg-muted/30">
                <span className="font-medium">{process.name}</span>
                <Button variant="outline" size="sm" onClick={() => setIsPreviewDialogOpen(true)}>
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>
              </div>
            ))}
            {(company.onboardingProcesses?.length || 0) <= 1 && (
              <p className="text-sm text-muted-foreground text-center py-4">No AI-generated forms yet. Use the builder above to create one.</p>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Modal for "Coming Soon" */}
      <AlertDialog open={isPreviewDialogOpen} onOpenChange={setIsPreviewDialogOpen}>
          <AlertDialogContent>
              <AlertDialogHeader>
                  <AlertDialogTitle>Preview Not Available</AlertDialogTitle>
                  <AlertDialogDescription>
                      This functionality is coming soon.
                  </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                  <AlertDialogAction onClick={() => setIsPreviewDialogOpen(false)}>OK</AlertDialogAction>
              </AlertDialogFooter>
          </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

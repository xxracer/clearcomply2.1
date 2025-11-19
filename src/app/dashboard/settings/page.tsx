

'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Building, Save, PlusCircle, Trash2, Loader2, Workflow, Edit, Upload, Wand2, Library, Eye, Info, ArrowRight, Link as LinkIcon, File as FileIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useTransition } from "react";
import Image from "next/image";
import { getCompanies, createOrUpdateCompany, addOnboardingProcess, deleteOnboardingProcess } from "@/app/actions/company-actions";
import { type Company, type OnboardingProcess, requiredDocSchema, type RequiredDoc, type ApplicationForm as AppFormType, AiFormField } from "@/lib/company-schemas";
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
import { cn } from "@/lib/utils";


// Main component for the settings page
export default function SettingsPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [company, setCompany] = useState<Partial<Company>>({});
  const [logoFile, setLogoFile] = useState<File | undefined>();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // State to determine if the company has been saved, which dictates field disabling
  const [isCompanySaved, setIsCompanySaved] = useState(false);
  // State to specifically trigger the confirmation dialog
  const [showSavedDialog, setShowSavedDialog] = useState(false);

  // AI Form Builder state
  const [isAiBuilderOpen, setIsAiBuilderOpen] = useState(false);
  const [aiBuilderMode, setAiBuilderMode] = useState<'wizard' | 'prompt'>('wizard');
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  // State for alert dialogs
  const [isCompanyDetailsDialogOpen, setCompanyDetailsDialogOpen] = useState(false);
  const [isProcessesDialogOpen, setIsProcessesDialogOpen] = useState(false);
  const [isAiBuilderInfoOpen, setIsAiBuilderInfoOpen] = useState(false);
  
  const [isPhase1InfoOpen, setIsPhase1InfoOpen] = useState(false);
  const [isPhase2InfoOpen, setIsPhase2InfoOpen] = useState(false);
  const [isPhase3InfoOpen, setIsPhase3InfoOpen] = useState(false);


  const showCompanyDetailsHint = !company.name;
  const showProcessesHint = !showCompanyDetailsHint && (!company.onboardingProcesses || company.onboardingProcesses.length === 0);

  const loadInitialData = async () => {
      setIsLoading(true);
      const companies = await getCompanies();
      const firstCompany = companies[0] || {
        // Set default onboarding process for new companies
        onboardingProcesses: [
          {
            id: 'default',
            name: 'Default Process',
            applicationForm: { id: 'default_form', name: 'Default Application', type: 'template' },
            interviewScreen: { type: 'template' },
            requiredDocs: [
              { id: 'i9', label: 'Form I-9 (Employment Eligibility)', type: 'upload' },
              { id: 'w4', label: 'Form W-4 (Tax Withholding)', type: 'upload' },
              { id: 'proofOfIdentity', label: 'Proof of Identity & Social Security', type: 'upload' },
              { id: 'educationalDiplomas', label: 'Educational Diplomas or Certificates', type: 'upload' },
            ]
          }
        ]
      };
      
      setCompany(firstCompany);

      if (firstCompany.id) {
          setIsCompanySaved(true);
      }

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

  // Load initial company data
  useEffect(() => {
    loadInitialData();
  }, []);

  const handleFieldChange = (field: keyof Company, value: any) => {
    setCompany(prev => ({ ...prev, [field]: value }));
  };
  
  const handleAddNewProcess = async (name: string, fields: AiFormField[]) => {
      if (!company.id) {
          toast({ variant: 'destructive', title: 'Error', description: 'Company must be saved before adding a process.' });
          return;
      }
      const newProcess: OnboardingProcess = {
          id: generateIdForServer(),
          name: name,
          applicationForm: { id: generateIdForServer(), name: name, type: 'custom', images: [], fields: fields },
          interviewScreen: { type: 'template' },
          requiredDocs: [],
      };
      
      startTransition(async () => {
          const result = await addOnboardingProcess(company.id!, newProcess);
          if (result.success && result.company) {
              setCompany(result.company);
              toast({
                  title: "Process Added",
                  description: `"${name}" has been saved.`
              });
          } else {
              toast({ variant: 'destructive', title: 'Save Failed', description: result.error });
          }
      });
  };
  
    const handleGenerateFromPrompt = async () => {
        if (!prompt) {
            toast({ variant: 'destructive', title: 'Prompt is empty', description: 'Please describe the form you want to create.' });
            return;
        }
        setIsGenerating(true);
        try {
            const result = await generateForm({ prompt });
            await handleAddNewProcess(result.formName, result.fields);
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
      
      let dataToSave = { ...company };
      
      if (logoFile) {
        const logoKey = `logo-${dataToSave.name?.replace(/\s+/g, '-')}-${Date.now()}`;
        if (dataToSave.logo) {
          await deleteFile(dataToSave.logo);
        }
        dataToSave.logo = await uploadKvFile(logoFile, logoKey);
      }

      const result = await createOrUpdateCompany(dataToSave);
      if (result.success && result.company) {
          setCompany(result.company);
          setLogoFile(undefined);
          setIsCompanySaved(true);
          setShowSavedDialog(true);
      } else {
        toast({ variant: "destructive", title: "Save Failed", description: result.error || "Failed to save." });
      }
    });
  };

  const [activeProcessId, setActiveProcessId] = useState<string | null>(null);

  useEffect(() => {
    if (!activeProcessId && company.onboardingProcesses && company.onboardingProcesses.length > 0) {
      setActiveProcessId(company.onboardingProcesses[0].id);
    }
  }, [company.onboardingProcesses, activeProcessId]);

    const handleDeleteProcess = (processId: string) => {
        if (!company.id) return;
        startTransition(async () => {
            const result = await deleteOnboardingProcess(company.id!, processId);
            if (result.success && result.company) {
                setCompany(result.company);
                toast({
                    title: "Process Deleted",
                    description: `The onboarding process has been removed.`,
                });
            } else {
                toast({ variant: 'destructive', title: 'Deletion Failed', description: result.error });
            }
        });
    };

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
              {showCompanyDetailsHint && (
                <div className="flex items-center gap-2 text-primary animate-pulse">
                    <p className="text-sm font-medium hidden md:block">Click here first!</p>
                    <ArrowRight className="h-4 w-4 hidden md:block" />
                    <AlertDialog open={isCompanyDetailsDialogOpen} onOpenChange={setCompanyDetailsDialogOpen}>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7"><Info className="h-5 w-5 text-muted-foreground" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>First, Set Up Your Company</AlertDialogTitle>
                                <AlertDialogDescription>
                                    Before creating onboarding processes, please fill out your company's basic information. This information is saved once and cannot be changed later.
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
        <CardContent>
          <div className="border rounded-lg p-4 relative">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <fieldset disabled={isCompanySaved}>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="company-name">Company Name</Label>
                    <Input id="company-name" placeholder="e.g., Acme Company" value={company.name || ''} onChange={(e) => handleFieldChange('name', e.target.value)} />
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
                    <Input id="company-email" type="email" placeholder="contact@acme.com" value={company.email || ''} onChange={(e) => handleFieldChange('email', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                      <Label htmlFor="company-logo">Company Logo</Label>
                      <div className="flex items-center gap-4">
                          <Input id="company-logo" type="file" className="max-w-xs" onChange={(e) => { if (e.target.files) setLogoFile(e.target.files[0])}} accept="image/*" />
                          {logoPreview && <Image src={logoPreview} alt="Logo Preview" width={40} height={40} className="rounded-sm object-contain" />}
                      </div>
                  </div>
                </div>
              </fieldset>
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
            </div>
            <div className="mt-6">
              <Button size="lg" disabled={isPending || isCompanySaved} onClick={handleSave}>
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
                    <CardTitle className="text-xl">Onboarding Processes</CardTitle>
                </div>
                 {showProcessesHint && (
                    <div className="flex items-center gap-2 text-primary animate-pulse">
                        <p className="text-sm font-medium hidden md:block">Click here first!</p>
                        <ArrowRight className="h-4 w-4 hidden md:block" />
                        <AlertDialog open={isProcessesDialogOpen} onOpenChange={setIsProcessesDialogOpen}>
                            <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-7 w-7"><Info className="h-5 w-5 text-muted-foreground" /></Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                                <AlertDialogHeader>
                                    <AlertDialogTitle>Manage Onboarding Processes</AlertDialogTitle>
                                    <AlertDialogDescription>
                                        This section shows your company's onboarding processes. The "Default Process" is always available. Use the AI Builder below to create new, customized processes for different roles.
                                    </AlertDialogDescription>
                                </AlertDialogHeader>
                                <AlertDialogFooter>
                                    <AlertDialogAction onClick={() => {}}>Got it!</AlertDialogAction>
                                </AlertDialogFooter>
                            </AlertDialogContent>
                        </AlertDialog>
                    </div>
                 )}
            </div>
            <CardDescription>Manage your saved application forms and onboarding processes.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1 space-y-2">
            <h3 className="font-semibold px-2">Application Forms</h3>
            <div className="flex flex-col gap-1">
                {(company.onboardingProcesses || []).map(p => (
                     <div key={p.id} className={cn("flex items-center justify-between p-2 rounded-md", activeProcessId === p.id && "bg-muted")}>
                        <button
                        className="flex-1 text-left"
                        onClick={() => setActiveProcessId(p.id)}
                        >
                        <span className="font-medium">{p.name}</span>
                        </button>
                    </div>
                ))}
            </div>
          </div>

          <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-6 border rounded-lg p-4">
             <div className="space-y-2">
                <h3 className="font-semibold">Interview Process</h3>
                 <div className="p-4 border rounded-md space-y-3">
                    <p className="font-medium">Default Interview</p>
                    <p className="text-sm text-muted-foreground">Standard interview questions and review form.</p>
                     <Button asChild variant="outline" size="sm">
                        <Link href="/dashboard/settings/preview/interview" target="_blank">
                            <Eye className="mr-2 h-4 w-4" />
                            Preview
                        </Link>
                    </Button>
                </div>
             </div>
             <div className="space-y-2">
                <h3 className="font-semibold">Documentation Process</h3>
                 <div className="p-4 border rounded-md space-y-3">
                    <p className="font-medium">Default Documentation</p>
                    <p className="text-sm text-muted-foreground">Standard set of required documents (I-9, W-4, etc.).</p>
                     <Button asChild variant="outline" size="sm">
                        <Link href="/dashboard/settings/preview/documentation" target="_blank">
                            <Eye className="mr-2 h-4 w-4" />
                            Preview
                        </Link>
                    </Button>
                </div>
             </div>
          </div>
        </CardContent>
      </Card>


      <Card>
          <CardHeader className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                  <Wand2 className="h-5 w-5 text-primary" />
                  <CardTitle className="text-xl">AI-Powered Process Builder</CardTitle>
              </div>
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
          </CardHeader>
        <CardContent className="space-y-6">
             <RadioGroup value={aiBuilderMode} onValueChange={(v) => setAiBuilderMode(v as 'wizard' | 'prompt')} className="flex items-center gap-4">
                <div className="flex items-center space-x-2"><RadioGroupItem value="wizard" id="wizard" /><Label htmlFor="wizard">Guided Wizard</Label></div>
                <div className="flex items-center space-x-2"><RadioGroupItem value="prompt" id="prompt" /><Label htmlFor="prompt">Free-form Prompt</Label></div>
            </RadioGroup>

            {aiBuilderMode === 'wizard' ? (
                <div>
                    <p className="text-sm text-muted-foreground mb-4">A step-by-step guide to create a new form by answering questions.</p>
                    <Button onClick={() => setIsAiBuilderOpen(true)} disabled={!isCompanySaved}>
                        <Wand2 className="mr-2 h-4 w-4" />
                        Start Wizard
                    </Button>
                     {!isCompanySaved && <p className="text-xs text-destructive mt-2">You must save the company details before using the wizard.</p>}
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="p-4 border rounded-lg space-y-3">
                         <div className="flex items-center justify-between">
                            <Label htmlFor="prompt-p1" className="font-semibold">Phase 1: Application Form</Label>
                            <div className="flex items-center gap-2 text-primary animate-pulse">
                                <p className="text-sm font-medium hidden md:block">Click here first!</p>
                                <ArrowRight className="h-4 w-4 hidden md:block" />
                                <AlertDialog open={isPhase1InfoOpen} onOpenChange={setIsPhase1InfoOpen}>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7"><Info className="h-5 w-5 text-muted-foreground" /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Phase 1: Generate an Application Form</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                Describe the job or role you're hiring for. Be as specific as possible for the best results. Include the types of information you need, such as personal details (name, phone, address), work history (CV, experience), specific licenses, etc.
                                                <br/><br/>
                                                Example: "An application form for a delivery driver that requires a valid driver's license, 2 years of driving experience, and asks for their full name, phone number, and address."
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogAction onClick={() => {}}>Got it!</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                        <Textarea id="prompt-p1" placeholder="Describe the application form you need..." value={prompt} onChange={(e) => setPrompt(e.target.value)} disabled={!isCompanySaved} />
                        <Button onClick={handleGenerateFromPrompt} disabled={isGenerating || isPending || !isCompanySaved}>
                            {(isGenerating || isPending) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Generate Form
                        </Button>
                         {!isCompanySaved && <p className="text-xs text-destructive mt-2">You must save the company details before generating a form.</p>}
                    </div>

                    <div className="p-4 border rounded-lg space-y-3 opacity-50">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label htmlFor="prompt-p2" className="font-semibold">Phase 2: Interview Screen</Label>
                                <p className="text-xs text-amber-600 font-semibold">Available soon</p>
                            </div>
                            <div className="flex items-center gap-2 text-primary animate-pulse">
                                <p className="text-sm font-medium hidden md:block">Click here first!</p>
                                <ArrowRight className="h-4 w-4 hidden md:block" />
                                <AlertDialog open={isPhase2InfoOpen} onOpenChange={setIsPhase2InfoOpen}>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7"><Info className="h-5 w-5 text-muted-foreground" /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Phase 2: Interview Screen (Coming Soon)</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This feature is currently in development. Soon, you'll be able to describe the key questions and criteria for the interview, and the AI will generate a structured interview review form.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogAction onClick={() => {}}>Got it!</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </div>
                        <Textarea id="prompt-p2" placeholder="Describe the interview questions or screen..." disabled />
                        <Button disabled>Generate</Button>
                    </div>

                    <div className="p-4 border rounded-lg space-y-3 opacity-50">
                        <div className="flex items-center justify-between">
                            <div className="space-y-1">
                                <Label htmlFor="prompt-p3" className="font-semibold">Phase 3: Required Documentation</Label>
                                <p className="text-xs text-amber-600 font-semibold">Available soon</p>
                            </div>
                             <div className="flex items-center gap-2 text-primary animate-pulse">
                                <p className="text-sm font-medium hidden md:block">Click here first!</p>
                                <ArrowRight className="h-4 w-4 hidden md:block" />
                                <AlertDialog open={isPhase3InfoOpen} onOpenChange={setIsPhase3InfoOpen}>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-7 w-7"><Info className="h-5 w-5 text-muted-foreground" /></Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>Phase 3: Required Documentation (Coming Soon)</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                This feature is currently in development. You will be able to list the documents needed (e.g., "Driver's License, I-9 Form, W-4"), and the AI will create the document request phase.
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogAction onClick={() => {}}>Got it!</AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
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
                }}
             />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Your IA Forms</CardTitle>
          <CardDescription>
            Forms created by the AI will appear here. They are saved automatically.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {(company.onboardingProcesses || []).filter(p => p.applicationForm?.type === 'custom').map(process => (
              <div key={process.id} className="flex items-center justify-between p-3 rounded-md border bg-muted/30">
                <span className="font-medium">{process.name}</span>
                <div className="flex items-center gap-2">
                    <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="outline" size="sm">
                        <Eye className="mr-2 h-4 w-4" />
                        Preview
                        </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                        <AlertDialogTitle>Preview Not Available</AlertDialogTitle>
                        <AlertDialogDescription>
                            This functionality is coming soon.
                        </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                        <AlertDialogAction>OK</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                    </AlertDialog>
                    <AlertDialog>
                        <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                            </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the "{process.name}" onboarding process.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDeleteProcess(process.id)}>Delete</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                </div>
              </div>
            ))}
            {(company.onboardingProcesses?.filter(p => p.applicationForm?.type === 'custom').length || 0) === 0 && (
              <p className="text-sm text-muted-foreground text-center py-4">No AI-generated forms yet. Use the builder above to create one.</p>
            )}
          </div>
        </CardContent>
      </Card>

      <AlertDialog open={showSavedDialog} onOpenChange={setShowSavedDialog}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Settings Saved</AlertDialogTitle>
                <AlertDialogDescription>
                    Company details have been updated and are now locked. You can still manage onboarding users.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogAction onClick={() => setShowSavedDialog(false)}>OK</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

    </div>
  );
}

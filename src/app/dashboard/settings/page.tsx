
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Building, Save, PlusCircle, Trash2, Loader2, Workflow, Edit, Upload, Wand2, Library, Eye, Info, ArrowRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useTransition } from "react";
import Image from "next/image";
import { getCompanies, createOrUpdateCompany } from "@/app/actions/company-actions";
import { type Company, type OnboardingProcess, requiredDocSchema, type RequiredDoc } from "@/lib/company-schemas";
import { getFile, uploadKvFile, deleteFile } from "@/app/actions/kv-actions";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { generateIdForServer } from "@/lib/server-utils";
import { generateForm } from "@/ai/flows/generate-form-flow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { File as FileIcon } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import Link from "next/link";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { AiFormBuilderDialog } from "@/components/dashboard/settings/ai-form-builder-dialog";


const allPossibleDocs: RequiredDoc[] = [
    { id: 'i9', label: 'I-9 Form', type: 'upload' },
    { id: 'w4', label: 'W-4 Form', type: 'upload' },
    { id: 'proofOfIdentity', label: 'Proof of Identity (ID Card)', type: 'upload' },
    { id: 'educationalDiplomas', label: 'Educational Diplomas/Certificates', type: 'upload' },
];


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

  const [isAddDocDialogOpen, setIsAddDocDialogOpen] = useState(false);
  const [selectedProcessForDoc, setSelectedProcessForDoc] = useState<string | null>(null);

  // State for alert dialogs
  const [isCompanyDetailsDialogOpen, setCompanyDetailsDialogOpen] = useState(false);
  const [isFormLibraryDialogOpen, setFormLibraryDialogOpen] = useState(false);
  const [isCustomFormInfoOpen, setIsCustomFormInfoOpen] = useState(false);

  // State for the "click here first" hint
  const [companyDetailsHintViewed, setCompanyDetailsHintViewed] = useState(false);
  const showCompanyDetailsHint = !company.name && !companyDetailsHintViewed;


  // Load initial company data
  useEffect(() => {
    async function loadInitialData() {
      setIsLoading(true);
      const companies = await getCompanies();
      const firstCompany = companies[0] || {};
      
      if (!firstCompany.onboardingProcesses || firstCompany.onboardingProcesses.length === 0) {
          firstCompany.onboardingProcesses = [{
              id: generateIdForServer(),
              name: "Custom Form 1",
              applicationForm: { id: generateIdForServer(), name: "Default Template Form", type: 'template', images: [] },
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
  
  const handleProcessChange = (processId: string, field: keyof OnboardingProcess, value: any) => {
      const updatedProcesses = company.onboardingProcesses?.map(p => {
          if (p.id === processId) {
              return { ...p, [field]: value };
          }
          return p;
      }) || [];
      handleFieldChange('onboardingProcesses', updatedProcesses);
  };

  const handleApplicationFormChange = (processId: string, field: string, value: any) => {
      const updatedProcesses = company.onboardingProcesses?.map(p => {
          if (p.id === processId) {
              const updatedAppForm = { ...(p.applicationForm || {}), [field]: value };
              return { ...p, applicationForm: updatedAppForm };
          }
          return p;
      }) || [];
      handleFieldChange('onboardingProcesses', updatedProcesses);
  };

  const handleInterviewScreenChange = (processId: string, field: string, value: any) => {
      const updatedProcesses = company.onboardingProcesses?.map(p => {
          if (p.id === processId) {
              const updatedInterviewScreen = { ...(p.interviewScreen || {}), [field]: value };
              return { ...p, interviewScreen: updatedInterviewScreen };
          }
          return p;
      }) || [];
      handleFieldChange('onboardingProcesses', updatedProcesses);
  };

  const handleLogoChange = (file: File | null) => {
    if (file) {
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleCustomFormImageUpload = async (processId: string, file: File) => {
      if (!company.name) {
          toast({ variant: 'destructive', title: "Company Name Required", description: "Please enter a company name before uploading images." });
          return;
      }

      startTransition(async () => {
          try {
              const imageKey = `form-image-${company.name?.replace(/\s+/g, '-')}-${processId}-${Date.now()}`;
              await uploadKvFile(file, imageKey); // uploadKvFile returns the key now
              
              const updatedProcesses = company.onboardingProcesses?.map(p => {
                  if (p.id === processId) {
                      // The applicationForm might not exist, so we ensure it does.
                      const appForm = p.applicationForm || { id: generateIdForServer(), name: "Custom Form", type: 'custom', images: [] };
                      const currentImages = appForm.images || [];
                      const updatedAppForm = { ...appForm, images: [...currentImages, imageKey] };
                      return { ...p, applicationForm: updatedAppForm };
                  }
                  return p;
              }) || [];

              handleFieldChange('onboardingProcesses', updatedProcesses);
              toast({ title: "Image Uploaded", description: "The form image has been added." });
          } catch (error) {
              toast({ variant: "destructive", title: "Upload Failed", description: (error as Error).message });
          }
      });
  };
  
    const handleInterviewImageUpload = async (processId: string, file: File) => {
      if (!company.name) {
          toast({ variant: 'destructive', title: "Company Name Required", description: "Please enter a company name before uploading images." });
          return;
      }
      startTransition(async () => {
          try {
              const imageKey = `interview-image-${company.name?.replace(/\s+/g, '-')}-${processId}-${Date.now()}`;
              const imageUrl = await uploadKvFile(file, imageKey);
              handleInterviewScreenChange(processId, 'imageUrl', imageUrl);
              toast({ title: "Image Uploaded", description: "The interview background has been updated." });
          } catch (error) {
              toast({ variant: "destructive", title: "Upload Failed", description: (error as Error).message });
          }
      });
    };


  const handleRemoveCustomFormImage = (processId: string, imageUrl: string) => {
      startTransition(async () => {
          try {
              await deleteFile(imageUrl); // imageUrl is the key
              const updatedProcesses = company.onboardingProcesses?.map(p => {
                  if (p.id === processId) {
                      const updatedImages = p.applicationForm?.images?.filter(imgKey => imgKey !== imageUrl) || [];
                      const updatedAppForm = { ...p.applicationForm, images: updatedImages };
                      return { ...p, applicationForm: updatedAppForm };
                  }
                  return p;
              }) || [];
              handleFieldChange('onboardingProcesses', updatedProcesses);
              toast({ title: "Image Removed", description: "The form image has been deleted." });
          } catch(error) {
              toast({ variant: "destructive", title: "Deletion Failed", description: (error as Error).message });
          }
      });
  }

  const handleAddNewProcess = (name: string, type: 'template' | 'custom' = 'template') => {
      const newProcess: OnboardingProcess = {
          id: generateIdForServer(),
          name: name,
          applicationForm: { id: generateIdForServer(), name: name, type: type, images: [] },
          interviewScreen: { type: 'template' },
          requiredDocs: [],
      };
      const updatedProcesses = [...(company.onboardingProcesses || []), newProcess];
      handleFieldChange('onboardingProcesses', updatedProcesses);
      setActiveProcessId(newProcess.id);
  };
  
  const handleRemoveProcess = (processId: string) => {
      // Prevent deleting the last process
      if ((company.onboardingProcesses?.length || 0) <= 1) {
          toast({ variant: 'destructive', title: 'Cannot Delete', description: 'You must have at least one onboarding process.' });
          return;
      }
      const updatedProcesses = company.onboardingProcesses?.filter(p => p.id !== processId) || [];
      handleFieldChange('onboardingProcesses', updatedProcesses);
  };
  
  const handleAddRequiredDoc = (docId: string) => {
      if (!selectedProcessForDoc || !docId) return;

      const docToAdd = allPossibleDocs.find(d => d.id === docId);
      if (!docToAdd) return;

      const updatedProcesses = company.onboardingProcesses?.map(p => {
          if (p.id === selectedProcessForDoc) {
              const currentDocs = p.requiredDocs || [];
              // Avoid duplicates
              if (currentDocs.some(d => d.id === docId)) {
                  toast({ variant: 'destructive', title: 'Document Already Added' });
                  return p;
              }
              return { ...p, requiredDocs: [...currentDocs, docToAdd] };
          }
          return p;
      }) || [];
      handleFieldChange('onboardingProcesses', updatedProcesses);
      setIsAddDocDialogOpen(false);
      setSelectedProcessForDoc(null);
  };
  
  const handleRemoveRequiredDoc = (processId: string, docId: string) => {
      const updatedProcesses = company.onboardingProcesses?.map(p => {
          if (p.id === processId) {
              const updatedDocs = p.requiredDocs?.filter(d => d.id !== docId) || [];
              return { ...p, requiredDocs: updatedDocs };
          }
          return p;
      }) || [];
      handleFieldChange('onboardingProcesses', updatedProcesses);
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

  const activeProcess = company.onboardingProcesses?.find(p => p.id === activeProcessId);


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
        <CardContent className="p-4">
          <div className="border rounded-lg p-4 relative">
             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <CardTitle className="mb-1 flex items-center gap-2 text-xl">
                        <Building className="h-5 w-5" />
                        Company Details
                    </CardTitle>
                    <AlertDialog open={isCompanyDetailsDialogOpen} onOpenChange={setCompanyDetailsDialogOpen}>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6"><Info className="h-4 w-4 text-muted-foreground cursor-pointer" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>About Company Details</AlertDialogTitle>
                                <AlertDialogDescription>
                                    This information will be used across the application portal, including on application forms and documentation requests to personalize the experience for your candidates.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogAction onClick={() => setCompanyDetailsHintViewed(true)}>Got it!</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    {showCompanyDetailsHint && (
                        <div className="flex items-center gap-2 animate-pulse ml-2">
                            <p className="text-sm font-medium text-primary">Click here first!</p>
                            <ArrowRight className="h-5 w-5 text-primary -scale-x-100" />
                        </div>
                    )}
                </div>

            </div>

            <CardDescription className="mb-6">Manage the company profile and associated onboarding users. Remember to save your changes.</CardDescription>
            <fieldset disabled={showCompanyDetailsHint} className="grid grid-cols-1 md:grid-cols-2 gap-8 disabled:opacity-50">
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
                        <Input id="company-logo" type="file" className="max-w-xs" onChange={(e) => handleLogoChange(e.target.files?.[0] || null)} accept="image/*" />
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
              <Button size="lg" disabled={isPending || showCompanyDetailsHint} onClick={handleSave}>
                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                Save Company & Continue
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
            <div className="flex items-center gap-2">
                <CardTitle className="flex items-center gap-2"><Library className="h-5 w-5" /> Form Library</CardTitle>
                 <AlertDialog open={isFormLibraryDialogOpen} onOpenChange={setFormLibraryDialogOpen}>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6"><Info className="h-4 w-4 text-muted-foreground cursor-pointer" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>About the Form Library</AlertDialogTitle>
                            <AlertDialogDescription>
                                Manage different onboarding processes for various roles. Each process can have its own custom forms, interview screens, and required documents. You can add as many processes as you need.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogAction>Got it!</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            <CardDescription>Manage your saved application forms and onboarding processes.</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Left Column: Form List */}
          <div className="md:col-span-1 space-y-2">
            <h3 className="font-semibold px-2">Available Forms</h3>
            <div className="flex flex-col gap-1">
              {(company.onboardingProcesses || []).map(p => (
                 <Button
                    key={p.id}
                    variant={activeProcessId === p.id ? "secondary" : "ghost"}
                    className="justify-start"
                    onClick={() => setActiveProcessId(p.id)}
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
            {activeProcess ? (
              <>
                <div>
                  <Label htmlFor="form-name">Form Name</Label>
                  <Input 
                    id="form-name" 
                    value={activeProcess.name}
                    onChange={(e) => handleProcessChange(activeProcess.id, 'name', e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                    <RadioGroup 
                        value={activeProcess.applicationForm?.type || 'template'} 
                        onValueChange={(value) => handleApplicationFormChange(activeProcess.id, 'type', value)} 
                        className="flex items-center gap-4 mt-2"
                    >
                        <div className="flex items-center space-x-2"><RadioGroupItem value="template" id={`template-${activeProcess.id}`} /><Label htmlFor={`template-${activeProcess.id}`}>Use Template Application Form</Label></div>
                        <div className="flex items-center space-x-2"><RadioGroupItem value="custom" id={`custom-${activeProcess.id}`} /><Label htmlFor={`custom-${activeProcess.id}`}>Use Custom Application Form Images</Label></div>
                    </RadioGroup>
                </div>

                {activeProcess.applicationForm?.type === 'custom' && (
                  <div className="p-4 border rounded-md space-y-4 bg-muted/20">
                    <div className="flex items-center gap-2">
                      <Label className="font-semibold">Custom Form Images (PDF/Image)</Label>
                       <AlertDialog open={isCustomFormInfoOpen} onOpenChange={setIsCustomFormInfoOpen}>
                        <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6"><Info className="h-4 w-4 text-muted-foreground cursor-pointer" /></Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                            <AlertDialogHeader>
                                <AlertDialogTitle>Custom Application Forms</AlertDialogTitle>
                                <AlertDialogDescription>
                                    You can upload images or a PDF of your existing paper application form. Candidates will see these images but will not be able to fill them out online. You will need to contact them separately to complete the application.
                                </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                                <AlertDialogAction>Got it!</AlertDialogAction>
                            </AlertDialogFooter>
                        </AlertDialogContent>
                    </AlertDialog>
                    </div>
                     <div className="space-y-2">
                        {(activeProcess.applicationForm?.images || []).map((imgKey) => (
                            <div key={imgKey} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                                <div className="flex items-center gap-2 text-sm truncate"><FileIcon className="h-4 w-4" /><span className="truncate">{imgKey.split('/').pop()}</span></div>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveCustomFormImage(activeProcess.id, imgKey)} disabled={isPending}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                            </div>
                        ))}
                    </div>
                    {(!activeProcess.applicationForm?.images || activeProcess.applicationForm.images.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">No images uploaded.</p>}
                     <div className="flex items-center gap-2">
                        <Label htmlFor={`upload-${activeProcess.id}`} className="flex-grow"><Button asChild variant="outline" className="w-full cursor-pointer"><span><Upload className="mr-2 h-4 w-4" /> Upload PDF or Image</span></Button></Label>
                        <Input id={`upload-${activeProcess.id}`} type="file" className="hidden" accept="image/*,application/pdf" onChange={(e) => e.target.files && handleCustomFormImageUpload(activeProcess.id, e.target.files[0])} disabled={isPending}/>
                    </div>
                  </div>
                )}
                 <div className="flex justify-end">
                    <Button onClick={handleSave}>
                        {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Save Form
                    </Button>
                </div>
              </>
            ) : (
                <div className="text-center text-muted-foreground py-10">Select a form from the library to edit.</div>
            )}
          </div>
        </CardContent>
      </Card>


      <Card>
        <CardHeader>
            <div className="flex items-center gap-2">
                <CardTitle className="flex items-center gap-2 text-xl"><Wand2 className="h-5 w-5 text-primary" /> AI-Powered Form Builder</CardTitle>
                 <AlertDialog>
                    <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-6 w-6"><Info className="h-4 w-4 text-muted-foreground cursor-pointer" /></Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                        <AlertDialogHeader>
                            <AlertDialogTitle>About the AI Form Builder</AlertDialogTitle>
                            <AlertDialogDescription>
                                Describe a form in natural language, and the AI will generate a structured list of fields for you. You can then save this as a new onboarding process in your library.
                            </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                            <AlertDialogAction>Got it!</AlertDialogAction>
                        </AlertDialogFooter>
                    </AlertDialogContent>
                </AlertDialog>
            </div>
            <CardDescription>Generate a new form structure using AI by answering a few questions.</CardDescription>
        </CardHeader>
        <CardContent>
            <Button onClick={() => setIsAiBuilderOpen(true)}>
                <Wand2 className="mr-2 h-4 w-4" />
                Start
            </Button>
             <AiFormBuilderDialog 
                isOpen={isAiBuilderOpen} 
                onOpenChange={setIsAiBuilderOpen}
                companyName={company.name}
                onFormGenerated={(name) => {
                    handleAddNewProcess(name, 'custom');
                    toast({
                        title: "AI Form Created!",
                        description: `"${name}" has been added to your Form Library. You can now customize it.`
                    });
                }}
             />
        </CardContent>
      </Card>

    </div>
  );

    

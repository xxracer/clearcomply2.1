
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Building, Save, PlusCircle, Trash2, Loader2, Workflow, Edit, Upload, Wand2, Library } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect, useTransition } from "react";
import Image from "next/image";
import { getCompanies, createOrUpdateCompany, deleteCompany } from "@/app/actions/company-actions";
import { type Company, type OnboardingProcess } from "@/lib/company-schemas";
import { getFile, uploadKvFile, deleteFile } from "@/app/actions/kv-actions";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { generateIdForServer } from "@/lib/server-utils";
import { generateForm } from "@/ai/flows/generate-form-flow";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { File as FileIcon } from "lucide-react";


// Main component for the settings page
export default function SettingsPage() {
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(true);
  const [company, setCompany] = useState<Partial<Company>>({});
  const [logoFile, setLogoFile] = useState<File | undefined>();
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // AI Form Builder state
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedForm, setGeneratedForm] = useState<any>(null);


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
              const updatedAppForm = { ...p.applicationForm, [field]: value };
              return { ...p, applicationForm: updatedAppForm };
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
              const url = await uploadKvFile(file, imageKey); // uploadKvFile returns the key
              const updatedProcesses = company.onboardingProcesses?.map(p => {
                  if (p.id === processId) {
                      const currentImages = p.applicationForm?.images || [];
                      const updatedAppForm = { ...p.applicationForm, images: [...currentImages, url] };
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

  const handleRemoveCustomFormImage = (processId: string, imageUrl: string) => {
      startTransition(async () => {
          try {
              await deleteFile(imageUrl); // imageUrl is the key
              const updatedProcesses = company.onboardingProcesses?.map(p => {
                  if (p.id === processId) {
                      const updatedImages = p.applicationForm?.images?.filter(url => url !== imageUrl) || [];
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

  const handleAddNewProcess = () => {
      const newProcess: OnboardingProcess = {
          id: generateIdForServer(),
          name: `Custom Form ${ (company.onboardingProcesses?.length || 0) + 1}`,
          applicationForm: { id: generateIdForServer(), name: "New Form", type: 'template', images: [] },
          interviewScreen: { type: 'template' },
          requiredDocs: [],
      };
      const updatedProcesses = [...(company.onboardingProcesses || []), newProcess];
      handleFieldChange('onboardingProcesses', updatedProcesses);
  };
  
  const handleRemoveProcess = (processId: string) => {
      const updatedProcesses = company.onboardingProcesses?.filter(p => p.id !== processId) || [];
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

  const handleGenerateForm = async () => {
    if (!aiPrompt) {
        toast({ variant: 'destructive', title: 'Prompt is empty', description: 'Please describe the form you want to generate.' });
        return;
    }
    setIsGenerating(true);
    setGeneratedForm(null);
    try {
        const result = await generateForm({ prompt: aiPrompt });
        setGeneratedForm(result);
        toast({ title: 'Form Generated!', description: 'The AI has suggested a form structure.' });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Generation Failed', description: (error as Error).message });
    } finally {
        setIsGenerating(false);
    }
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
        <CardHeader>
          <div className="flex items-center gap-2">
            <RadioGroup defaultValue="single" className="flex items-center">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="single" id="single-company" />
                <Label htmlFor="single-company">Single Company</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="multiple" id="multiple-companies" disabled />
                <Label htmlFor="multiple-companies" className="text-muted-foreground/50">Multiple Companies</Label>
              </div>
            </RadioGroup>
          </div>
        </CardHeader>
        <CardContent>
          <div className="border rounded-lg p-4">
            <CardTitle className="mb-1 flex items-center gap-2 text-xl">
              <Building className="h-5 w-5" />
              New Company Details
            </CardTitle>
            <CardDescription className="mb-6">Manage the company profile and associated onboarding users. Remember to save your changes.</CardDescription>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
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
            </div>
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
            <CardTitle className="flex items-center gap-2"><Library className="h-5 w-5" /> Your Form Library</CardTitle>
            <CardDescription>Manage and reuse your saved application forms and onboarding processes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {(company.onboardingProcesses || []).map((process) => (
            <Card key={process.id} className="bg-muted/20 overflow-hidden">
                <CardHeader className="flex flex-row items-center justify-between bg-muted/40 py-3 px-4">
                    <div className="flex items-center gap-4">
                        <Workflow className="h-5 w-5" />
                        <Input value={process.name} onChange={(e) => handleProcessChange(process.id, 'name', e.target.value)} className="text-lg font-semibold border-0 shadow-none focus-visible:ring-0 p-0 h-auto bg-transparent" />
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => handleRemoveProcess(process.id)} disabled={(company.onboardingProcesses?.length || 0) <= 1}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                </CardHeader>
                <CardContent className="p-4 space-y-4">
                    <div>
                        <Label className="font-semibold">Application Form Type</Label>
                        <RadioGroup 
                            value={process.applicationForm?.type || 'template'} 
                            onValueChange={(value) => handleApplicationFormChange(process.id, 'type', value)} 
                            className="flex items-center gap-4 mt-2"
                        >
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="template" id={`template-${process.id}`} />
                                <Label htmlFor={`template-${process.id}`}>Use Standard Template</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <RadioGroupItem value="custom" id={`custom-${process.id}`} />
                                <Label htmlFor={`custom-${process.id}`}>Use Custom PDF/Image Form</Label>
                            </div>
                        </RadioGroup>
                    </div>

                    {process.applicationForm?.type === 'custom' && (
                        <div className="p-4 border rounded-md space-y-4 bg-background">
                            <Label className="font-semibold">Custom Form Images</Label>
                            <div className="space-y-2">
                                {(process.applicationForm?.images || []).map((url) => (
                                    <div key={url} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                                        <div className="flex items-center gap-2 text-sm truncate">
                                            <FileIcon className="h-4 w-4" />
                                            <span className="truncate">{url.split('/').pop()}</span>
                                        </div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveCustomFormImage(process.id, url)} disabled={isPending}>
                                            <Trash2 className="h-4 w-4 text-destructive" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                            {(!process.applicationForm?.images || process.applicationForm.images.length === 0) && (
                                <p className="text-sm text-muted-foreground text-center py-4">No images uploaded for this form.</p>
                            )}
                            <div className="flex items-center gap-2">
                                <Label htmlFor={`upload-${process.id}`} className="flex-grow">
                                    <Button asChild variant="outline" className="w-full cursor-pointer">
                                        <span><Upload className="mr-2 h-4 w-4" /> Upload Image</span>
                                    </Button>
                                </Label>
                                <Input 
                                    id={`upload-${process.id}`} 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*"
                                    onChange={(e) => e.target.files && handleCustomFormImageUpload(process.id, e.target.files[0])}
                                    disabled={isPending}
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>
          ))}
          <Button variant="outline" onClick={handleAddNewProcess}>
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Onboarding Process
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl"><Wand2 className="h-5 w-5 text-primary" /> AI-Powered Form Builder</CardTitle>
            <CardDescription>Describe the form you need, and let AI generate it for you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="ai-prompt">Form Description</Label>
                <Textarea 
                    id="ai-prompt" 
                    placeholder="e.g., 'Create a form for a delivery driver application. I need fields for name, contact info, vehicle type, and years of experience.'" 
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                />
            </div>
            <Button onClick={handleGenerateForm} disabled={isGenerating}>
                {isGenerating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                Generate Form
            </Button>
            {isGenerating && <p className="text-sm text-muted-foreground">AI is thinking...</p>}

            {generatedForm && (
                <Alert className="mt-4">
                    <Wand2 className="h-4 w-4" />
                    <AlertTitle>AI Suggestion: {generatedForm.formName}</AlertTitle>
                    <AlertDescription>
                        <p className="mb-2">The AI has generated the following form structure. This can be used to create a new form in your library.</p>
                        <pre className="text-xs bg-muted p-2 rounded-md overflow-x-auto">
                            {JSON.stringify(generatedForm, null, 2)}
                        </pre>
                    </AlertDescription>
                </Alert>
            )}

        </CardContent>
      </Card>

    </div>
  );
}

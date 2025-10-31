
'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings, Building, Save, PlusCircle, Trash2, Loader2, Workflow, Edit, Upload, Wand2, Library, Eye } from "lucide-react";
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
  const [aiPrompt, setAiPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedForm, setGeneratedForm] = useState<any>(null);

  const [isAddDocDialogOpen, setIsAddDocDialogOpen] = useState(false);
  const [selectedProcessForDoc, setSelectedProcessForDoc] = useState<string | null>(null);


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

  const handleAddNewProcess = () => {
      const newProcess: OnboardingProcess = {
          id: generateIdForServer(),
          name: `New Onboarding Process #${ (company.onboardingProcesses?.length || 0) + 1}`,
          applicationForm: { id: generateIdForServer(), name: "New Form", type: 'template', images: [] },
          interviewScreen: { type: 'template' },
          requiredDocs: [],
      };
      const updatedProcesses = [...(company.onboardingProcesses || []), newProcess];
      handleFieldChange('onboardingProcesses', updatedProcesses);
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
        <CardContent className="p-4">
          <div className="border rounded-lg p-4">
            <CardTitle className="mb-1 flex items-center gap-2 text-xl">
              <Building className="h-5 w-5" />
              Company Details
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
            <CardTitle className="flex items-center gap-2"><Library className="h-5 w-5" /> Form Library</CardTitle>
            <CardDescription>Manage your saved application forms and onboarding processes.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Accordion type="multiple" className="w-full" defaultValue={[(company.onboardingProcesses?.[0]?.id || '')]}>
            {(company.onboardingProcesses || []).map((process) => (
              <AccordionItem value={process.id} key={process.id}>
                <AccordionTrigger>
                    <div className="flex items-center justify-between w-full pr-4">
                        <div className="flex items-center gap-2">
                            <Workflow className="h-5 w-5" />
                            <span className="font-semibold">{process.name}</span>
                        </div>
                        <Button variant="ghost" size="icon" onClick={(e) => { e.stopPropagation(); handleRemoveProcess(process.id); }} disabled={(company.onboardingProcesses?.length || 0) <= 1}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                    </div>
                </AccordionTrigger>
                <AccordionContent className="p-4 space-y-6">
                    {/* Phase 1 */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Phase 1: Application Form</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <RadioGroup 
                            value={process.applicationForm?.type || 'template'} 
                            onValueChange={(value) => handleApplicationFormChange(process.id, 'type', value)} 
                            className="flex items-center gap-4 mt-2"
                        >
                            <div className="flex items-center space-x-2"><RadioGroupItem value="template" id={`template-${process.id}`} /><Label htmlFor={`template-${process.id}`}>Use Template Application Form</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="custom" id={`custom-${process.id}`} /><Label htmlFor={`custom-${process.id}`}>Use Custom Application Form Images</Label></div>
                        </RadioGroup>
                        {process.applicationForm?.type === 'custom' && (
                          <div className="p-4 border rounded-md space-y-4 bg-background mt-2">
                            <Label className="font-semibold">Custom Form Images</Label>
                            <div className="space-y-2">
                                {(process.applicationForm?.images || []).map((imgKey) => (
                                    <div key={imgKey} className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                                        <div className="flex items-center gap-2 text-sm truncate"><FileIcon className="h-4 w-4" /><span className="truncate">{imgKey.split('/').pop()}</span></div>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveCustomFormImage(process.id, imgKey)} disabled={isPending}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                    </div>
                                ))}
                            </div>
                            {(!process.applicationForm?.images || process.applicationForm.images.length === 0) && <p className="text-sm text-muted-foreground text-center py-4">No images uploaded.</p>}
                            <div className="flex items-center gap-2">
                                <Label htmlFor={`upload-${process.id}`} className="flex-grow"><Button asChild variant="outline" className="w-full cursor-pointer"><span><Upload className="mr-2 h-4 w-4" /> Upload Image</span></Button></Label>
                                <Input id={`upload-${process.id}`} type="file" className="hidden" accept="image/*" onChange={(e) => e.target.files && handleCustomFormImageUpload(process.id, e.target.files[0])} disabled={isPending}/>
                            </div>
                          </div>
                        )}
                      </CardContent>
                      <CardContent className="border-t pt-4">
                        <Button variant="outline" size="sm" asChild>
                           <Link href="/dashboard/settings/preview/application" target="_blank"><Eye className="mr-2 h-4 w-4" /> Preview Phase 1 Page</Link>
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Phase 2 */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Phase 2: Interview Screen</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                         <RadioGroup 
                            value={process.interviewScreen?.type || 'template'} 
                            onValueChange={(value) => handleInterviewScreenChange(process.id, 'type', value)} 
                            className="flex items-center gap-4 mt-2"
                        >
                            <div className="flex items-center space-x-2"><RadioGroupItem value="template" id={`int-template-${process.id}`} /><Label htmlFor={`int-template-${process.id}`}>Use Template Interview Screen</Label></div>
                            <div className="flex items-center space-x-2"><RadioGroupItem value="custom" id={`int-custom-${process.id}`} /><Label htmlFor={`int-custom-${process.id}`}>Use Custom Background Image</Label></div>
                        </RadioGroup>
                         {process.interviewScreen?.type === 'custom' && (
                            <div className="p-4 border rounded-md space-y-4 bg-background mt-2">
                                <Label className="font-semibold">Custom Background Image</Label>
                                {process.interviewScreen.imageUrl && <Image src={process.interviewScreen.imageUrl} alt="Interview background preview" width={100} height={56} className="rounded-md object-cover" />}
                                <Input type="file" accept="image/*" onChange={(e) => e.target.files && handleInterviewImageUpload(process.id, e.target.files[0])} disabled={isPending} />
                            </div>
                         )}
                      </CardContent>
                       <CardContent className="border-t pt-4">
                        <Button variant="outline" size="sm" asChild>
                           <Link href="/dashboard/settings/preview/interview" target="_blank"><Eye className="mr-2 h-4 w-4" /> Preview Phase 2 Page</Link>
                        </Button>
                      </CardContent>
                    </Card>

                    {/* Phase 3 */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Phase 3: Required Documentation</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2">
                          <Label>Select documents required for this process</Label>
                           {(process.requiredDocs && process.requiredDocs.length > 0) ? (
                            <div className="space-y-2 pt-2">
                              {process.requiredDocs.map(doc => (
                                <div key={doc.id} className="flex items-center justify-between p-2 rounded-md bg-muted/50 text-sm">
                                  <span>{doc.label}</span>
                                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveRequiredDoc(process.id, doc.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                                </div>
                              ))}
                            </div>
                           ) : (
                            <p className="text-sm text-muted-foreground pt-2">No documents added yet.</p>
                           )}
                           <Dialog open={isAddDocDialogOpen && selectedProcessForDoc === process.id} onOpenChange={setIsAddDocDialogOpen}>
                              <DialogTrigger asChild>
                                <Button variant="outline" className="mt-2" onClick={() => {setSelectedProcessForDoc(process.id); setIsAddDocDialogOpen(true); }}>
                                  <PlusCircle className="mr-2 h-4 w-4" /> Add Document
                                </Button>
                              </DialogTrigger>
                              <DialogContent>
                                <DialogHeader><DialogTitle>Add a Required Document</DialogTitle></DialogHeader>
                                <Select onValueChange={(value) => handleAddRequiredDoc(value)}>
                                  <SelectTrigger><SelectValue placeholder="Select a document to add..." /></SelectTrigger>
                                  <SelectContent>
                                    <SelectGroup>
                                      <SelectLabel>Official Forms</SelectLabel>
                                      {allPossibleDocs.map(doc => <SelectItem key={doc.id} value={doc.id}>{doc.label}</SelectItem>)}
                                    </SelectGroup>
                                  </SelectContent>
                                </Select>
                              </DialogContent>
                           </Dialog>
                      </CardContent>
                       <CardContent className="border-t pt-4">
                        <Button variant="outline" size="sm" asChild>
                           <Link href="/dashboard/settings/preview/documentation" target="_blank"><Eye className="mr-2 h-4 w-4" /> Preview Phase 3 Page</Link>
                        </Button>
                      </CardContent>
                    </Card>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          <Button variant="outline" onClick={handleAddNewProcess} className="mt-4">
            <PlusCircle className="mr-2 h-4 w-4" /> Add New Onboarding Process
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl"><Wand2 className="h-5 w-5 text-primary" /> AI-Powered Form Builder</CardTitle>
            <CardDescription>Generate a new form structure using AI.</CardDescription>
        </CardHeader>
        <CardContent>
            <Button>
                <Wand2 className="mr-2 h-4 w-4" />
                Start
            </Button>
        </CardContent>
      </Card>

    </div>
  );
}

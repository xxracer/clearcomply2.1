
'use client';

import { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ArrowRight, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { generateFormFromOptions, GenerateFormOptionsOutput } from '@/ai/flows/generate-form-from-options-flow';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { format } from 'date-fns';
import { FormItem } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AiFormField } from '@/lib/company-schemas';

const personalInfoOptions = [
    { id: 'fullName', label: 'Full Name' },
    { id: 'contactInfo', label: 'Contact Info (Phone, Email)' },
    { id: 'address', label: 'Full Address' },
    { id: 'dob', label: 'Date of Birth' },
    { id: 'ssn', label: 'Social Security Number' },
];

type AiFormBuilderDialogProps = {
    isOpen: boolean;
    onOpenChange: (isOpen: boolean) => void;
    companyName?: string;
    onFormGenerated: (name: string, fields: AiFormField[]) => Promise<void>;
}

export function AiFormBuilderDialog({ isOpen, onOpenChange, companyName, onFormGenerated }: AiFormBuilderDialogProps) {
    const { toast } = useToast();
    const [step, setStep] = useState(1);
    const [isLoading, setIsLoading] = useState(false);
    const [generatedForm, setGeneratedForm] = useState<{ name: string; date: Date; fields: GenerateFormOptionsOutput['fields'] } | null>(null);
    const [isPending, startTransition] = useTransition();


    // Form State
    const [formPurpose, setFormPurpose] = useState('');
    const [isMultiCompany, setIsMultiCompany] = useState('no');
    const [selectedPersonalInfo, setSelectedPersonalInfo] = useState<string[]>(['fullName', 'contactInfo']);
    const [includeReferences, setIncludeReferences] = useState('no');
    const [includeEducation, setIncludeEducation] = useState('no');
    const [includeEmploymentHistory, setIncludeEmploymentHistory] = useState('no');
    const [includeCredentials, setIncludeCredentials] = useState('no');

    const resetForm = () => {
        setStep(1);
        setIsLoading(false);
        setGeneratedForm(null);
        setFormPurpose('');
        setIsMultiCompany('no');
        setSelectedPersonalInfo(['fullName', 'contactInfo']);
        setIncludeReferences('no');
        setIncludeEducation('no');
        setIncludeEmploymentHistory('no');
        setIncludeCredentials('no');
    };

    const handleOpenChange = (open: boolean) => {
        if (!open) {
            resetForm();
        }
        onOpenChange(open);
    };

    const handleGenerateForm = async () => {
        if (!formPurpose) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please provide a purpose for the form.'});
            return;
        }
        setIsLoading(true);
        setGeneratedForm(null);
        try {
            const result = await generateFormFromOptions({
                formPurpose,
                companyName: isMultiCompany === 'no' ? companyName : undefined,
                includeLogo: false, // This is a design choice, not a form field.
                personalInfo: selectedPersonalInfo.map(id => personalInfoOptions.find(opt => opt.id === id)!.label),
                includeReferences: includeReferences === 'yes',
                includeEducation: includeEducation === 'yes',
                includeEmploymentHistory: includeEmploymentHistory === 'yes',
                includeCredentials: includeCredentials === 'yes',
            });
            
            setGeneratedForm({ name: result.formName, date: new Date(), fields: result.fields });
            toast({ title: 'Form Generated!', description: 'Your new form structure is ready to preview.' });
        } catch (error) {
            toast({ variant: 'destructive', title: 'Generation Failed', description: (error as Error).message });
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleConfirmAndSave = () => {
        if (!generatedForm) return;
        startTransition(async () => {
            await onFormGenerated(generatedForm.name, generatedForm.fields);
            handleOpenChange(false);
        });
    }

    const renderStep = () => {
        if (isLoading || isPending) {
            return (
                <div className="flex flex-col items-center justify-center space-y-4 p-8">
                    <Loader2 className="h-12 w-12 animate-spin text-primary" />
                    <p className="text-muted-foreground">
                        {isPending ? "Saving your form..." : "Generating your form, please wait..."}
                    </p>
                </div>
            );
        }
        
        if (generatedForm) {
            return (
                 <div className="space-y-6 p-4 max-h-[70vh] overflow-y-auto">
                    <Alert variant="default" className="border-green-500/50">
                        <AlertTitle className="font-semibold text-green-700">Form Created Successfully!</AlertTitle>
                        <AlertDescription>
                            Review the preview below. If you're happy with it, click "Confirm and Save" to add it to your Form Library.
                        </AlertDescription>
                    </Alert>

                    <div className="border rounded-lg p-4 space-y-4">
                        <h3 className="text-lg font-semibold">{generatedForm.name}</h3>
                        <p className="text-sm text-muted-foreground">Date: {format(generatedForm.date, 'PPP')} | Type: Custom Form</p>
                        
                        <div className="mt-4 pt-4 border-t space-y-4">
                            <h4 className="font-medium">Form Preview:</h4>
                            <div className="space-y-4 rounded-md border p-4 bg-muted/20">
                                {generatedForm.fields.map(field => (
                                    <div key={field.id}>
                                        <Label htmlFor={field.id}>{field.label}{field.required && <span className="text-destructive">*</span>}</Label>
                                        {field.type === 'text' && <Input id={field.id} />}
                                        {field.type === 'email' && <Input id={field.id} type="email" />}
                                        {field.type === 'number' && <Input id={field.id} type="number" />}
                                        {field.type === 'phone' && <Input id={field.id} type="tel" />}
                                        {field.type === 'date' && <Input id={field.id} type="date" />}
                                        {field.type === 'textarea' && <Textarea id={field.id} />}
                                        {field.type === 'checkbox' && <div className="flex items-center space-x-2 pt-2"><Checkbox id={field.id} /><label htmlFor={field.id} className="text-sm font-normal">I agree</label></div>}
                                        {field.type === 'select' && (
                                            <Select>
                                                <SelectTrigger id={field.id}>
                                                    <SelectValue placeholder="Select an option" />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {(field.options || []).map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>


                    <div className="flex justify-end gap-2">
                        <Button variant="ghost" onClick={() => setGeneratedForm(null)}>Back to Editor</Button>
                        <Button onClick={handleConfirmAndSave}>Confirm and Save</Button>
                    </div>
                </div>
            )
        }

        switch (step) {
            case 1:
                return (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label htmlFor="formPurpose">What is the main purpose of this form? (e.g., "Driver Application", "Office Staff Onboarding")</Label>
                            <Input id="formPurpose" value={formPurpose} onChange={(e) => setFormPurpose(e.target.value)} />
                        </div>
                        <div className="space-y-2">
                            <Label>Is this form for one specific company or multiple companies?</Label>
                            <RadioGroup value={isMultiCompany} onValueChange={setIsMultiCompany} className="flex gap-4">
                                <FormItem className="flex items-center space-x-2"><RadioGroupItem value="no" id="comp-no" /><Label htmlFor="comp-no" className="ml-2 font-normal">One company</Label></FormItem>
                                <FormItem className="flex items-center space-x-2"><RadioGroupItem value="yes" id="comp-yes" /><Label htmlFor="comp-yes" className="ml-2 font-normal">Multiple</Label></FormItem>
                            </RadioGroup>
                        </div>
                    </div>
                );
            case 2:
                return (
                    <div className="space-y-4">
                        <Label>Which personal data points are most important?</Label>
                        <p className="text-sm text-muted-foreground">Select all that apply.</p>
                        {personalInfoOptions.map(item => (
                            <div key={item.id} className="flex items-center space-x-2">
                                <Checkbox
                                    id={item.id}
                                    checked={selectedPersonalInfo.includes(item.id)}
                                    onCheckedChange={(checked) => {
                                        return checked
                                            ? setSelectedPersonalInfo([...selectedPersonalInfo, item.id])
                                            : setSelectedPersonalInfo(selectedPersonalInfo.filter(id => id !== item.id));
                                    }}
                                />
                                <label htmlFor={item.id} className="text-sm font-medium leading-none">
                                    {item.label}
                                </label>
                            </div>
                        ))}
                    </div>
                );
            case 3:
                return (
                    <div className="space-y-6">
                        <div className="space-y-2">
                            <Label>Do you need to include a section for personal/professional references?</Label>
                             <RadioGroup value={includeReferences} onValueChange={setIncludeReferences} className="flex gap-4">
                                <FormItem className="flex items-center space-x-2"><RadioGroupItem value="yes" id="ref-yes" /><Label htmlFor="ref-yes" className="ml-2 font-normal">Yes</Label></FormItem>
                                <FormItem className="flex items-center space-x-2"><RadioGroupItem value="no" id="ref-no" /><Label htmlFor="ref-no" className="ml-2 font-normal">No</Label></FormItem>
                            </RadioGroup>
                        </div>
                        <div className="space-y-2">
                            <Label>Do you need to add data about where the person studied?</Label>
                             <RadioGroup value={includeEducation} onValueChange={setIncludeEducation} className="flex gap-4">
                                <FormItem className="flex items-center space-x-2"><RadioGroupItem value="yes" id="edu-yes" /><Label htmlFor="edu-yes" className="ml-2 font-normal">Yes</Label></FormItem>
                                <FormItem className="flex items-center space-x-2"><RadioGroupItem value="no" id="edu-no" /><Label htmlFor="edu-no" className="ml-2 font-normal">No</Label></FormItem>
                            </RadioGroup>
                        </div>
                        <div className="space-y-2">
                            <Label>Do you need to add references from previous jobs?</Label>
                            <RadioGroup value={includeEmploymentHistory} onValueChange={setIncludeEmploymentHistory} className="flex gap-4">
                                <FormItem className="flex items-center space-x-2"><RadioGroupItem value="yes" id="emp-yes" /><Label htmlFor="emp-yes" className="ml-2 font-normal">Yes</Label></FormItem>
                                <FormItem className="flex items-center space-x-2"><RadioGroupItem value="no" id="emp-no" /><Label htmlFor="emp-no" className="ml-2 font-normal">No</Label></FormItem>
                            </RadioGroup>
                        </div>
                         <div className="space-y-2">
                            <Label>Do you need to add credentials (licenses, certifications, etc.)?</Label>
                            <RadioGroup value={includeCredentials} onValueChange={setIncludeCredentials} className="flex gap-4">
                                <FormItem className="flex items-center space-x-2"><RadioGroupItem value="yes" id="cred-yes" /><Label htmlFor="cred-yes" className="ml-2 font-normal">Yes</Label></FormItem>
                                <FormItem className="flex items-center space-x-2"><RadioGroupItem value="no" id="cred-no" /><Label htmlFor="cred-no" className="ml-2 font-normal">No</Label></FormItem>
                            </RadioGroup>
                        </div>
                    </div>
                )
            default:
                return null;
        }
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[600px]">
                <DialogHeader>
                    <DialogTitle>AI Form Builder</DialogTitle>
                    {!generatedForm && <DialogDescription>
                        Answer a few questions and the AI will generate a form structure for you. (Step {step} of 3)
                    </DialogDescription>}
                </DialogHeader>
                
                <div className="py-4">
                    {renderStep()}
                </div>

                {!generatedForm && (
                     <div className="flex justify-between">
                        <Button variant="outline" onClick={() => setStep(s => s - 1)} disabled={step === 1 || isLoading}>
                            <ArrowLeft className="mr-2 h-4 w-4" /> Back
                        </Button>
                        {step < 3 && (
                            <Button onClick={() => setStep(s => s + 1)} disabled={isLoading}>
                                Next <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        )}
                        {step === 3 && (
                             <Button onClick={handleGenerateForm} disabled={isLoading}>
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Generate Form
                            </Button>
                        )}
                    </div>
                )}
            </DialogContent>
        </Dialog>
    );
}

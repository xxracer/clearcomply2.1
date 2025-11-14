
'use client'

import { getPersonnel, updateCandidateLicense, getCompanies } from "@/app/actions/client-actions";
import { CandidatesActions } from "@/app/dashboard/candidates/_components/candidates-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { type ApplicationData } from "@/lib/schemas";
import { add, isBefore, format } from "date-fns";
import { AlertTriangle, FileClock, Mail, FileUp, Loader2, CalendarIcon, Upload } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Company } from "@/lib/company-schemas";

// Helper to convert string to JS Date
function toDate(dateString: string | Date | undefined): Date | null {
  if (!dateString) return null;
  if (dateString instanceof Date) return dateString;
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return null;
    return date;
  } catch (e) {
    return null;
  }
}

const isLicenseExpiringSoon = (expirationDate: any): boolean => {
  const expiry = toDate(expirationDate);
  if (!expiry) return false;
  // Documents expiring in the next 60 days or are already expired
  const sixtyDaysFromNow = add(new Date(), { days: 60 });
  return isBefore(expiry, sixtyDaysFromNow);
};

function UpdateLicenseDialog({ person, onLicenseUpdated }: { person: ApplicationData, onLicenseUpdated: () => void }) {
    const [isUpdating, setIsUpdating] = useState(false);
    const [licenseFile, setLicenseFile] = useState<File | null>(null);
    const [expirationDate, setExpirationDate] = useState<Date | undefined>();
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    
    const handleUpdate = async () => {
        if (!licenseFile || !expirationDate) {
            toast({ variant: 'destructive', title: 'Missing Information', description: 'Please provide both a new license file and an expiration date.'});
            return;
        }

        setIsUpdating(true);
        try {
            const result = await updateCandidateLicense(person.id, licenseFile, expirationDate);
            if (result.success) {
                toast({ title: 'License Updated', description: `Driver's license for ${person.firstName} has been updated.`});
                onLicenseUpdated();
                setOpen(false);
            } else {
                throw new Error(result.error);
            }
        } catch(error) {
            toast({ variant: 'destructive', title: 'Update Failed', description: (error as Error).message });
        } finally {
            setIsUpdating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button variant="secondary" size="sm"><FileUp className="mr-2 h-4 w-4" /> Update License</Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader>
                    <DialogTitle>Update Driver's License for {person.firstName} {person.lastName}</DialogTitle>
                    <DialogDescription>Upload the new license file and select the new expiration date.</DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="license-file">New License File</Label>
                        <Input id="license-file" type="file" accept="image/*,.pdf" onChange={(e) => setLicenseFile(e.target.files?.[0] || null)} />
                    </div>
                     <div className="space-y-2">
                        <Label>New Expiration Date</Label>
                         <Popover>
                            <PopoverTrigger asChild>
                                <Button
                                variant={"outline"}
                                className={cn(
                                    "w-full justify-start text-left font-normal",
                                    !expirationDate && "text-muted-foreground"
                                )}
                                >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {expirationDate ? format(expirationDate, "PPP") : <span>Pick a date</span>}
                                </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                                <Calendar
                                mode="single"
                                selected={expirationDate}
                                onSelect={setExpirationDate}
                                initialFocus
                                />
                            </PopoverContent>
                        </Popover>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="ghost" onClick={() => setOpen(false)} disabled={isUpdating}>Cancel</Button>
                    <Button onClick={handleUpdate} disabled={isUpdating}>
                        {isUpdating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Update
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}

export default function ExpiringDocumentationPage() {
  const [expiringPersonnel, setExpiringPersonnel] = useState<ApplicationData[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();


  const fetchPersonnel = useCallback(async () => {
    setLoading(true);
    const [data, companies] = await Promise.all([
        getPersonnel(),
        getCompanies()
    ]);
    const filteredData = data.filter(p => isLicenseExpiringSoon(p.driversLicenseExpiration));
    setExpiringPersonnel(filteredData);
    if (companies && companies.length > 0) {
        setCompany(companies[0]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchPersonnel();
    // Listen for storage changes to keep data in sync across tabs
    window.addEventListener('storage', fetchPersonnel);
    return () => {
        window.removeEventListener('storage', fetchPersonnel);
    };
  }, [fetchPersonnel]);

  const handleRenewLicense = (candidate: ApplicationData) => {
    const processId = company?.onboardingProcesses?.[0]?.id;

    if (!processId) {
        toast({
            variant: "destructive",
            title: "Configuration Error",
            description: "No onboarding process is configured to generate a documentation link.",
        });
        return;
    }

    toast({
      title: "Email Simulation",
      description: `An email has been sent to ${candidate.firstName} with a link to renew their license documentation.`,
    });

    const renewalLink = `${window.location.origin}/documentation?processId=${processId}&candidateId=${candidate.id}`;
    navigator.clipboard.writeText(renewalLink);
    
    toast({
      title: "Link Copied!",
      description: `The license renewal link for ${candidate.firstName} has been copied to your clipboard.`,
    });
  };

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <FileClock className="h-12 w-12 text-muted-foreground animate-pulse" />
      </div>
    );
  }

  if (expiringPersonnel.length === 0) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-full">
        <div className="flex flex-col items-center gap-2 text-center">
          <FileClock className="h-12 w-12 text-muted-foreground" />
          <h3 className="text-2xl font-bold tracking-tight">No Expiring Documents</h3>
          <p className="text-sm text-muted-foreground">
            All personnel documentation is up-to-date.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-headline font-bold text-foreground">Expiring Documentation</h1>
      <Card>
        <CardContent className="p-0">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Document</TableHead>
                        <TableHead>Expiration Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {expiringPersonnel.map((person) => {
                        const expirationDate = toDate(person.driversLicenseExpiration);
                        const isExpired = expirationDate ? isBefore(expirationDate, new Date()) : false;
                        return (
                          <TableRow key={person.id} className={isExpired ? "bg-destructive/10" : "bg-yellow-100/50 dark:bg-yellow-900/20"}>
                              <TableCell className="font-medium flex items-center gap-2">
                                  <AlertTriangle className={`h-5 w-5 ${isExpired ? 'text-destructive' : 'text-yellow-500'}`} title={isExpired ? "License Expired!" : "License expires soon!"} />
                                  {person.firstName} {person.lastName}
                              </TableCell>
                              <TableCell className="capitalize">{person.status}</TableCell>
                              <TableCell>Driver's License</TableCell>
                              <TableCell>{expirationDate ? format(expirationDate, 'PPP') : 'N/A'}</TableCell>
                              <TableCell className="text-right space-x-2">
                                  <UpdateLicenseDialog person={person} onLicenseUpdated={fetchPersonnel} />
                                  <Button variant="outline" size="sm" onClick={() => handleRenewLicense(person)}>
                                      <Mail className="mr-2 h-4 w-4" />
                                      Notify
                                  </Button>
                                 <CandidatesActions candidateId={person.id} />
                              </TableCell>
                          </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </CardContent>
      </Card>
    </div>
  );
}

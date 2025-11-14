
'use client'

import { getNewHires } from "@/app/actions/client-actions";
import { getCompanies } from "@/app/actions/company-actions";
import { CandidatesActions } from "@/app/dashboard/candidates/_components/candidates-actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { type ApplicationData } from "@/lib/schemas";
import { add, isBefore, format } from "date-fns";
import { AlertTriangle, UserCheck, Mail, Info } from "lucide-react";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Company } from "@/lib/company-schemas";

// Helper to convert string to JS Date
function toDate(dateString: string | Date | undefined): Date | null {
  if (!dateString) return null;
  if (dateString instanceof Date) return dateString;
  try {
    return new Date(dateString);
  } catch (e) {
    return null;
  }
}

const isLicenseExpiringSoon = (expirationDate: any): boolean => {
  const expiry = toDate(expirationDate);
  if (!expiry) return false;
  // Documents expiring in the next 60 days
  const sixtyDaysFromNow = add(new Date(), { days: 60 });
  return isBefore(expiry, sixtyDaysFromNow);
};

export default function NewHiresPage() {
  const [newHires, setNewHires] = useState<ApplicationData[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const router = useRouter();

  const fetchNewHires = useCallback(async () => {
    setLoading(true);
    const [data, companies] = await Promise.all([
        getNewHires(),
        getCompanies()
    ]);
    setNewHires(data);
    if (companies && companies.length > 0) {
        setCompany(companies[0]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchNewHires();
    // Listen for storage changes to keep data in sync across tabs
    window.addEventListener('storage', fetchNewHires);
    return () => {
        window.removeEventListener('storage', fetchNewHires);
    };
  }, [fetchNewHires]);

  const handleRenewLicense = (candidate: ApplicationData) => {
    // Find the first process ID available to build a valid link.
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
        <UserCheck className="h-12 w-12 text-muted-foreground animate-pulse" />
      </div>
    );
  }

  if (newHires.length === 0) {
    return (
        <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm">
            <div className="flex flex-col items-center gap-2 text-center">
                <UserCheck className="h-12 w-12 text-muted-foreground" />
                <h3 className="text-2xl font-bold tracking-tight">No New Hires</h3>
                <p className="text-sm text-muted-foreground">
                    Candidates marked as "New Hire" will appear here.
                </p>
            </div>
        </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <h1 className="text-3xl font-headline font-bold text-foreground">New Hires</h1>
        <AlertDialog>
            <AlertDialogTrigger asChild>
                <Button variant="ghost" size="icon" className="h-7 w-7"><Info className="h-4 w-4 text-muted-foreground" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
                <AlertDialogHeader>
                    <AlertDialogTitle>New Hires</AlertDialogTitle>
                    <AlertDialogDescription>
                        This page lists candidates who have successfully passed the interview and have been marked as "New Hire". Here you can monitor their final documentation status and eventually mark them as active employees.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                    <AlertDialogAction>Got it!</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
      </div>
      <Card>
        <CardContent className="p-0">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Applying For</TableHead>
                        <TableHead>Date Applied</TableHead>
                        <TableHead>License Expires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {newHires.map((candidate: ApplicationData) => {
                      const appliedDate = toDate(candidate.date);
                      const expiryDate = toDate(candidate.driversLicenseExpiration);
                      const isExpiring = expiryDate ? isLicenseExpiringSoon(expiryDate) : false;
                      const isExpired = expiryDate ? isBefore(expiryDate, new Date()) : false;
                      
                      let rowClass = "";
                      if (isExpired) rowClass = "bg-destructive/10";
                      else if (isExpiring) rowClass = "bg-yellow-100/50 dark:bg-yellow-900/20";

                      return (
                        <TableRow key={candidate.id} className={rowClass}>
                            <TableCell className="font-medium flex items-center gap-2">
                                {(isExpiring || isExpired) && (
                                    <AlertTriangle className={`h-5 w-5 ${isExpired ? 'text-destructive' : 'text-yellow-500'}`} title={isExpired ? "License Expired!" : "License expires soon!"} />
                                )}
                                {candidate.firstName} {candidate.lastName}
                            </TableCell>
                            <TableCell>{candidate.applyingFor.join(', ')}</TableCell>
                            <TableCell>{appliedDate ? format(appliedDate, 'PPP') : 'N/A'}</TableCell>
                            <TableCell>{expiryDate ? format(expiryDate, 'PPP') : 'N/A'}</TableCell>
                            <TableCell className="text-right space-x-2">
                               {(isExpiring || isExpired) && (
                                 <Button variant="secondary" size="sm" onClick={() => handleRenewLicense(candidate)}>
                                    <Mail className="mr-2 h-4 w-4" />
                                    Renew License
                                 </Button>
                               )}
                               <CandidatesActions candidateId={candidate.id} />
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

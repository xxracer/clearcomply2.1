
'use server';

import { kv } from '@vercel/kv';
import { Company, OnboardingProcess } from "@/lib/company-schemas";
import { generateIdForServer } from "@/lib/server-utils";
import { revalidatePath } from 'next/cache';

const COMPANIES_KEY = 'companies_list';

export async function getCompanies(): Promise<Company[]> {
    const companies = await kv.get<Company[]>(COMPANIES_KEY);
    return companies || [];
}

export async function getCompany(id: string): Promise<Company | null> {
    const companies = await getCompanies();
    return companies.find(c => c.id === id) || null;
}

export async function createOrUpdateCompany(companyData: Partial<Company>) {
    try {
        const companies = await getCompanies();
        let companyToSave: Company;

        if (companyData.id) {
            const index = companies.findIndex(c => c.id === companyData.id);
            if (index > -1) {
                // Update
                companies[index] = { ...companies[index], ...companyData };
                companyToSave = companies[index];
            } else {
                throw new Error("Company not found for update.");
            }
        } else {
            // Create
            companyToSave = {
                ...companyData,
                id: generateIdForServer(),
                created_at: new Date().toISOString(),
            } as Company;
            companies.push(companyToSave);
        }

        await kv.set(COMPANIES_KEY, companies);
        
        // Revalidate paths to ensure data is fresh on the client
        revalidatePath('/dashboard/settings');
        revalidatePath('/dashboard');
        revalidatePath('/application');

        return { success: true, company: companyToSave };

    } catch (error) {
        console.error("Error saving company data:", error);
        return { success: false, error: `Failed to save company data: ${(error as Error).message}` };
    }
}

export async function addOnboardingProcess(companyId: string, process: OnboardingProcess) {
    try {
        const companies = await getCompanies();
        const companyIndex = companies.findIndex(c => c.id === companyId);

        if (companyIndex === -1) {
            throw new Error("Company not found to add process to.");
        }

        if (!companies[companyIndex].onboardingProcesses) {
            companies[companyIndex].onboardingProcesses = [];
        }
        companies[companyIndex].onboardingProcesses!.push(process);

        await kv.set(COMPANIES_KEY, companies);

        revalidatePath('/dashboard/settings');
        
        return { success: true, company: companies[companyIndex] };
    } catch (error) {
        console.error("Error adding onboarding process:", error);
        return { success: false, error: `Failed to add process: ${(error as Error).message}` };
    }
}


export async function deleteCompany(id: string) {
    try {
        let companies = await getCompanies();
        companies = companies.filter(c => c.id !== id);
        await kv.set(COMPANIES_KEY, companies);
        
        revalidatePath('/dashboard/settings');
        revalidatePath('/dashboard');
        revalidatePath('/application');
        
        return { success: true };
    } catch(error) {
        console.error("Error deleting company:", error);
        return { success: false, error: "Failed to delete company." };
    }
}

export async function deleteAllCompanies() {
     try {
        await kv.del(COMPANIES_KEY);
        revalidatePath('/dashboard/settings');
        revalidatePath('/dashboard');
        revalidatePath('/application');
        return { success: true };
    } catch(error) {
        console.error("Error deleting all companies:", error);
        return { success: false, error: "Failed to delete all companies." };
    }
}

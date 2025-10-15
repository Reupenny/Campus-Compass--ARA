import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';

interface HotspotData {
    type: string;
    pitch: number;
    yaw: number;
    text: string;
    target?: string;
    description?: string;
}

interface SceneData {
    id: string;
    name: string;
    imageUrl: string;
    lowResUrl?: string;
    geometry: { width: number };
    hotspots: HotspotData[];
    inView?: string; // For chat context
}

interface TourData {
    scenes: SceneData[];
}

interface TourContextType {
    tourData: TourData | null;
    loading: boolean;
    error: string | null;
    refetch: () => Promise<void>;
}

const TourContext = createContext<TourContextType | undefined>(undefined);

interface TourProviderProps {
    children: ReactNode;
}

export function TourProvider({ children }: TourProviderProps) {
    const [tourData, setTourData] = useState<TourData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadTourData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Add timestamp to prevent caching issues
            const response = await fetch(`/data/tour.json?t=${Date.now()}`);

            if (!response.ok) {
                throw new Error(`Failed to load tour data: ${response.status}`);
            }

            const data = await response.json();
            setTourData(data);
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : 'Failed to load tour data';
            setError(errorMessage);
            console.error('Error loading tour data:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadTourData();
    }, []);

    const refetch = async () => {
        await loadTourData();
    };

    return (
        <TourContext.Provider value={{ tourData, loading, error, refetch }}>
            {children}
        </TourContext.Provider>
    );
}

export function useTour(): TourContextType {
    const context = useContext(TourContext);
    if (context === undefined) {
        throw new Error('useTour must be used within a TourProvider');
    }
    return context;
}

export type { TourData, SceneData, HotspotData };
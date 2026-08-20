import { createContext, useContext, useEffect, useMemo, useReducer } from "react";
import { createAgentFromPrompt, generateDescriptionFromFacts, loadState, saveState } from "./mock";
import type { AppState, Lead, Listing, ListingDraft, Site, ThemeConfig } from "./types";

type Action =
  | { type: "set-prompt"; prompt: string }
  | { type: "set-current-agent"; agentId: string }
  | { type: "create-agent"; prompt: string; name: string; email: string; phone: string }
  | { type: "update-site"; siteId: string; patch: Partial<Site> }
  | { type: "update-theme"; siteId: string; patch: Partial<ThemeConfig> }
  | { type: "save-listing"; listing: ListingDraft; listingId?: string }
  | { type: "delete-listing"; listingId: string }
  | { type: "add-lead"; lead: Omit<Lead, "id" | "created_at"> };

type PortfoyAIContextValue = {
  state: AppState;
  currentAgent: AppState["agents"][number];
  currentSite: AppState["sites"][number];
  currentListings: Listing[];
  currentLeads: Lead[];
  setPrompt: (prompt: string) => void;
  setCurrentAgent: (agentId: string) => void;
  createAgent: (payload: { prompt: string; name: string; email: string; phone: string }) => void;
  updateSite: (siteId: string, patch: Partial<Site>) => void;
  updateTheme: (siteId: string, patch: Partial<ThemeConfig>) => void;
  saveListing: (listing: ListingDraft, listingId?: string) => void;
  deleteListing: (listingId: string) => void;
  addLead: (lead: Omit<Lead, "id" | "created_at">) => void;
  generateCopy: (listing: {
    title: string;
    district: string;
    listing_type: "sale" | "rent";
    m2: number;
    room_count: string;
    price: number;
    features: string[];
  }) => string;
};

const Context = createContext<PortfoyAIContextValue | null>(null);

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case "set-prompt":
      return { ...state, onboardingPrompt: action.prompt };
    case "set-current-agent":
      return { ...state, currentAgentId: action.agentId };
    case "create-agent": {
      const { agent, site, listings, prompt } = createAgentFromPrompt(action.prompt, action.name, action.email, action.phone);
      return {
        ...state,
        agents: [agent, ...state.agents],
        sites: [site, ...state.sites],
        listings: [...listings, ...state.listings],
        currentAgentId: agent.id,
        onboardingPrompt: prompt,
      };
    }
    case "update-site":
      return {
        ...state,
        sites: state.sites.map((site) => (site.id === action.siteId ? { ...site, ...action.patch } : site)),
      };
    case "update-theme":
      return {
        ...state,
        sites: state.sites.map((site) =>
          site.id === action.siteId ? { ...site, theme_config: { ...site.theme_config, ...action.patch } } : site,
        ),
      };
    case "save-listing": {
      const nextListing: Listing = {
        ...action.listing,
        id: action.listingId ?? `listing_${Math.random().toString(36).slice(2, 10)}`,
        created_at: new Date().toISOString(),
      };
      const filtered = state.listings.filter((listing) => listing.id !== nextListing.id);
      return {
        ...state,
        listings: [nextListing, ...filtered],
      };
    }
    case "delete-listing":
      return {
        ...state,
        listings: state.listings.filter((listing) => listing.id !== action.listingId),
        leads: state.leads.filter((lead) => lead.listing_id !== action.listingId),
      };
    case "add-lead":
      return {
        ...state,
        leads: [
          { ...action.lead, id: `lead_${Math.random().toString(36).slice(2, 10)}`, created_at: new Date().toISOString() },
          ...state.leads,
        ],
      };
    default:
      return state;
  }
}

export function PortfoyAIProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState);

  useEffect(() => {
    saveState(state);
  }, [state]);

  const currentAgent = state.agents.find((agent) => agent.id === state.currentAgentId) ?? state.agents[0];
  const currentSite = state.sites.find((site) => site.agent_id === currentAgent?.id) ?? state.sites[0];
  const currentListings = state.listings.filter((listing) => listing.site_id === currentSite?.id);
  const currentLeads = state.leads.filter((lead) => lead.site_id === currentSite?.id);

  const value = useMemo<PortfoyAIContextValue>(
    () => ({
      state,
      currentAgent,
      currentSite,
      currentListings,
      currentLeads,
      setPrompt: (prompt) => dispatch({ type: "set-prompt", prompt }),
      setCurrentAgent: (agentId) => dispatch({ type: "set-current-agent", agentId }),
      createAgent: (payload) => dispatch({ type: "create-agent", ...payload }),
      updateSite: (siteId, patch) => dispatch({ type: "update-site", siteId, patch }),
      updateTheme: (siteId, patch) => dispatch({ type: "update-theme", siteId, patch }),
      saveListing: (listing, listingId) => dispatch({ type: "save-listing", listing, listingId }),
      deleteListing: (listingId) => dispatch({ type: "delete-listing", listingId }),
      addLead: (lead) => dispatch({ type: "add-lead", lead }),
      generateCopy: generateDescriptionFromFacts,
    }),
    [state, currentAgent, currentSite, currentListings, currentLeads],
  );

  return <Context.Provider value={value}>{children}</Context.Provider>;
}

export function usePortfoyAI() {
  const context = useContext(Context);
  if (!context) throw new Error("usePortfoyAI must be used within PortfoyAIProvider");
  return context;
}

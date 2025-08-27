import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import type { Json } from "@/integrations/supabase/types";

interface TeamMember {
  id: string;
  name: string;
  position: string;
  bio?: string;
  image_url?: string;
  social_links?: Json;
  display_order?: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const TeamMembersDisplay = () => {
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTeamMembers();
  }, []);

  const fetchTeamMembers = async () => {
    try {
      // Use the secure view that doesn't expose contact information
      const { data, error } = await supabase
        .from("team_members_display")
        .select("*")
        .eq("is_active", true)
        .order("display_order", { ascending: true });

      if (error) throw error;
      setTeamMembers(data || []);
    } catch (error) {
      console.error("Error fetching team members:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-6">
              <div className="w-24 h-24 bg-muted rounded-full mx-auto mb-4"></div>
              <div className="h-4 bg-muted rounded mb-2"></div>
              <div className="h-3 bg-muted rounded mb-4"></div>
              <div className="h-16 bg-muted rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {teamMembers.map((member) => (
        <Card key={member.id} className="hover:shadow-lg transition-shadow">
          <CardContent className="p-6 text-center">
            {member.image_url && (
              <img
                src={member.image_url}
                alt={member.name}
                className="w-24 h-24 rounded-full mx-auto mb-4 object-cover"
              />
            )}
            <h3 className="font-semibold text-lg text-hanami-primary mb-1">
              {member.name}
            </h3>
            <Badge variant="secondary" className="mb-3">
              {member.position}
            </Badge>
            {member.bio && (
              <p className="text-sm text-hanami-neutral leading-relaxed">
                {member.bio}
              </p>
            )}
            {member.social_links && 
             typeof member.social_links === 'object' && 
             member.social_links !== null && 
             !Array.isArray(member.social_links) && 
             Object.keys(member.social_links).length > 0 && (
              <div className="flex justify-center space-x-3 mt-4">
                {Object.entries(member.social_links as Record<string, string>).map(([platform, url]) => (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-hanami-primary hover:text-hanami-secondary transition-colors"
                  >
                    {platform}
                  </a>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default TeamMembersDisplay;
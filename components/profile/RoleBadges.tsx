import { Shield } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { ROLE_LABEL, SPECIAL_ROLES } from "@/lib/utils/roles";
import type { UserRole } from "@/lib/types/database";

interface RoleBadgesProps {
  roles: UserRole[];
  className?: string;
}

// One Badge per role — Owner/Admin render with a Shield icon and the
// amber "special" variant so they read as trusted/staff at a glance,
// distinct from the three normal roles a user picks for themselves.
export function RoleBadges({ roles, className = "" }: RoleBadgesProps) {
  return (
    <>
      {roles.map((role) => {
        const special = SPECIAL_ROLES.has(role);
        return (
          <Badge key={role} variant={special ? "special" : "default"} className={`gap-1 ${className}`}>
            {special && <Shield className="h-3 w-3" />}
            {ROLE_LABEL[role] ?? role}
          </Badge>
        );
      })}
    </>
  );
}

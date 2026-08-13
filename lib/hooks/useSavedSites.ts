import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { doc, getDoc, setDoc, arrayUnion, arrayRemove } from "firebase/firestore";

import { db } from "@/lib/firebase";
import { COL } from "@/lib/constants/firestore";
import { useSession } from "@/lib/providers/SessionProvider";

export function useSavedSites() {
  const { session } = useSession();
  const uid = session.status === "authed" ? session.uid : null;
  const queryClient = useQueryClient();

  const { data: savedSiteIds = new Set<string>() } = useQuery({
    queryKey: ["savedSites", uid],
    queryFn: async () => {
      if (!uid) return new Set<string>();
      const snap = await getDoc(doc(db, COL.users, uid));
      const data = snap.data();
      return new Set<string>(data?.savedSites ?? []);
    },
    enabled: !!uid,
  });

  const toggleMutation = useMutation({
    mutationFn: ({ siteId, isSaving }: { siteId: string; isSaving: boolean }) => {
      if (!uid) return Promise.resolve();
      return setDoc(
        doc(db, COL.users, uid),
        { savedSites: isSaving ? arrayUnion(siteId) : arrayRemove(siteId) },
        { merge: true },
      );
    },
    onMutate: async ({ siteId, isSaving }: { siteId: string; isSaving: boolean }) => {
      await queryClient.cancelQueries({ queryKey: ["savedSites", uid] });
      const previous = queryClient.getQueryData<Set<string>>(["savedSites", uid]);
      const next = new Set(previous);
      if (isSaving) next.add(siteId);
      else next.delete(siteId);
      queryClient.setQueryData(["savedSites", uid], next);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(["savedSites", uid], context.previous);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["savedSites", uid] });
    },
  });

  return {
    savedSiteIds,
    toggleSavedSite: toggleMutation.mutate,
    isToggling: toggleMutation.isPending,
  };
}
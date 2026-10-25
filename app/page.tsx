import { redirect } from "next/navigation";

// The home address "/" has nothing of its own: send people to the Fitness tab, the first
// thing you see when you open DEVELOP (your gym barcode is at the top).
export default function Home() {
  redirect("/workouts");
}

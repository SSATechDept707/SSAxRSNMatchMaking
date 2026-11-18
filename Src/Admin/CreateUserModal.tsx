import { useEffect, useState } from "react";

type UserType = "member" | "candidate";

export default function CreateUserModal() {
    const [userType, setUserType] = useState<UserType>("Candidate");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");



    async function createUser(formData: any) {
        setLoading(true);
        setError("");
        setSuccess("");


        try {
            let res;

            if (userType === "candidate") {
                res = await fetch("/api/candidates", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(formData),
                })
            } else if (userType === "member") {
                fetch("/api/members", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        action: "registerCompany",
                        ...formData,
                    }),
                });
            }

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || "Failed to create user");
            }

            setSuccess("User created successfully!");

        } catch (e) {
            setError(
                e instanceof Error ? e.message : "Something went wrong"
            );

        } finally {
            setLoading(false);

            //pop up disappears
        }
    }



    return (
        <div></div>
    )


}


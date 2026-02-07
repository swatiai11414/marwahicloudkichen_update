import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Star, Send, Loader2 } from "lucide-react";

interface FeedbackFormProps {
  shopSlug: string;
  shopName: string;
  orderId?: string;
  onSubmit?: () => void;
}

export function FeedbackForm({ shopSlug, shopName, orderId, onSubmit }: FeedbackFormProps) {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [feedback, setFeedback] = useState("");
  const [name, setName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      toast({ title: "Please select a rating", variant: "destructive" });
      return;
    }

    setIsSubmitting(true);
    try {
      // Store feedback using proper API client
      await apiRequest("POST", `/api/shops/${shopSlug}/feedback`, {
        rating,
        feedback,
        name,
        orderId,
      });

      toast({ title: "Thank you for your feedback!" });
      setRating(0);
      setFeedback("");
      setName("");
      onSubmit?.();
    } catch {
      toast({ title: "Failed to submit feedback", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRatingText = (value: number) => {
    switch (value) {
      case 1: return "Poor";
      case 2: return "Fair";
      case 3: return "Good";
      case 4: return "Very Good";
      case 5: return "Excellent";
      default: return "Tap to rate";
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">How was your experience?</CardTitle>
        <CardDescription>
          Help {shopName} improve by sharing your feedback
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Star Rating */}
        <div className="space-y-2">
          <Label>Rating</Label>
          <div className="flex flex-col items-center gap-2">
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  className="p-1 transition-transform hover:scale-110"
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  data-testid={`button-rating-${star}`}
                >
                  <Star
                    className={`h-8 w-8 transition-colors ${
                      star <= (hoverRating || rating)
                        ? "fill-yellow-400 text-yellow-400"
                        : "text-muted-foreground"
                    }`}
                  />
                </button>
              ))}
            </div>
            <span className="text-sm text-muted-foreground">
              {getRatingText(hoverRating || rating)}
            </span>
          </div>
        </div>

        {/* Name (optional) */}
        <div className="space-y-2">
          <Label htmlFor="feedbackName">Your Name (optional)</Label>
          <Input
            id="feedbackName"
            placeholder="Enter your name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            data-testid="input-feedback-name"
          />
        </div>

        {/* Feedback Text */}
        <div className="space-y-2">
          <Label htmlFor="feedbackText">Your Feedback (optional)</Label>
          <Textarea
            id="feedbackText"
            placeholder="Tell us about your experience..."
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            rows={3}
            data-testid="input-feedback-text"
          />
        </div>

        <Button
          className="w-full gap-2"
          onClick={handleSubmit}
          disabled={isSubmitting || rating === 0}
          data-testid="button-submit-feedback"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Submitting...
            </>
          ) : (
            <>
              <Send className="h-4 w-4" />
              Submit Feedback
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Users, Award, Edit } from "lucide-react";

export default function Home() {
  const { user } = useAuth();

  // Fetch recent games if logged in
  const { data: recentGames, isLoading } = useQuery({
    queryKey: ['/api/games/recent'],
    enabled: !!user,
  });

  return (
    <div className="space-y-8">
      {/* Hero section */}
      <section className="py-12 px-4 text-center">
        <h1 className="text-4xl font-bold font-poppins mb-4">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary-500 to-secondary-500">Bingo</span>
          <span className="text-accent-500">学</span>
          <span className="block text-2xl mt-2 text-gray-800 dark:text-gray-200">Japanese Learning Bingo Game</span>
        </h1>
        <p className="text-lg text-gray-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
          An interactive and fun way to learn Japanese through customizable bingo games. 
          Create games, join with friends, and improve your language skills together!
        </p>
        <div className="flex flex-wrap justify-center gap-4">
          <Link href="/game/create">
            <Button size="lg" className="font-medium">
              Create Game
              <Edit className="ml-2 h-4 w-4" />
            </Button>
          </Link>
          {!user && (
            <Link href="/register">
              <Button size="lg" variant="outline" className="font-medium">
                Register Now
              </Button>
            </Link>
          )}
        </div>
      </section>

      {/* Features section */}
      <section className="py-8">
        <h2 className="text-2xl font-bold text-center mb-8">Features</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          <Card>
            <CardHeader className="space-y-1">
              <div className="flex justify-center">
                <Clock className="h-8 w-8 text-primary-500" />
              </div>
              <CardTitle className="text-xl text-center">Real-time Play</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p>Play together in real-time with interactive bingo boards and live consensus building.</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1">
              <div className="flex justify-center">
                <Users className="h-8 w-8 text-primary-500" />
              </div>
              <CardTitle className="text-xl text-center">Group Competition</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p>Compete in groups to achieve Bingo first. Work together to choose the right answers!</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="space-y-1">
              <div className="flex justify-center">
                <Award className="h-8 w-8 text-primary-500" />
              </div>
              <CardTitle className="text-xl text-center">AI-Generated Content</CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p>Use AI to quickly generate Japanese learning content tailored to your needs.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Recent games (only if logged in) */}
      {user && (
        <section className="py-8">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold">Your Recent Games</h2>
            <Link href="/game/create">
              <Button>
                Create New Game
              </Button>
            </Link>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <CardHeader>
                    <Skeleton className="h-6 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardContent>
                    <Skeleton className="h-4 w-full mb-2" />
                    <Skeleton className="h-4 w-2/3" />
                  </CardContent>
                  <CardFooter>
                    <Skeleton className="h-10 w-full" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : recentGames && recentGames.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {recentGames.map((game) => (
                <Card key={game.id}>
                  <CardHeader>
                    <CardTitle>{game.name}</CardTitle>
                    <CardDescription>
                      {game.status === 'active' ? 'In progress' : 
                       game.status === 'completed' ? 'Completed' : 'Waiting to start'}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">
                      {game.boardSize}×{game.boardSize} board • {game.groupCount} groups
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Created: {new Date(game.createdAt).toLocaleDateString()}
                    </p>
                  </CardContent>
                  <CardFooter>
                    {game.status === 'active' ? (
                      <Link href={`/game/host/${game.id}`} className="w-full">
                        <Button className="w-full">Continue Hosting</Button>
                      </Link>
                    ) : game.status === 'waiting' ? (
                      <Link href={`/game/host/${game.id}`} className="w-full">
                        <Button className="w-full">Start Game</Button>
                      </Link>
                    ) : (
                      <Link href={`/game/host/${game.id}`} className="w-full">
                        <Button variant="outline" className="w-full">View Results</Button>
                      </Link>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground mb-4">You haven't created any games yet.</p>
                <Link href="/game/create">
                  <Button>Create Your First Game</Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </section>
      )}

      {/* How to play section */}
      <section className="py-8">
        <h2 className="text-2xl font-bold text-center mb-6">How to Play</h2>
        <div className="max-w-3xl mx-auto bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
          <ol className="space-y-4 list-decimal list-inside">
            <li className="text-lg">
              <span className="font-medium">Create a Game:</span> 
              <p className="pl-6 text-gray-600 dark:text-gray-400 mt-1">
                Set up your bingo board size, questions/answers, and invite friends to join.
              </p>
            </li>
            <li className="text-lg">
              <span className="font-medium">Join Groups:</span>
              <p className="pl-6 text-gray-600 dark:text-gray-400 mt-1">
                Players join via a link and are randomly assigned to groups.
              </p>
            </li>
            <li className="text-lg">
              <span className="font-medium">Answer Questions:</span>
              <p className="pl-6 text-gray-600 dark:text-gray-400 mt-1">
                The host presents questions, and each group selects answers on their bingo board.
              </p>
            </li>
            <li className="text-lg">
              <span className="font-medium">Group Consensus:</span>
              <p className="pl-6 text-gray-600 dark:text-gray-400 mt-1">
                The most popular answer becomes the group's official answer.
              </p>
            </li>
            <li className="text-lg">
              <span className="font-medium">Achieve Bingo:</span>
              <p className="pl-6 text-gray-600 dark:text-gray-400 mt-1">
                Complete a row, column, or diagonal to win!
              </p>
            </li>
          </ol>
        </div>
      </section>
    </div>
  );
}

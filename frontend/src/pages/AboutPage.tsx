import React from "react";
import { motion } from "framer-motion";
import {
  Globe,
  Users,
  Share2,
  Shield,
  GitBranch,
  MessageCircle,
  UserPlus,
  Network,
  Lock,
} from "lucide-react";
import Card from "../components/ui/Card";

const AboutPage: React.FC = () => {
  const features = [
    {
      icon: Globe,
      title: "Distributed Network",
      description:
        "Connect across multiple nodes without being tied to a single platform. Break free from walled gardens.",
      color: "var(--primary-purple)",
    },
    {
      icon: Users,
      title: "Peer-to-Peer",
      description:
        "Built in the spirit of Diaspora - a truly decentralized social experience where you own your data.",
      color: "var(--primary-teal)",
    },
    {
      icon: Share2,
      title: "Content Distribution",
      description:
        "Share entries and content across the network through our intelligent inbox-based system.",
      color: "var(--primary-pink)",
    },
    {
      icon: GitBranch,
      title: "GitHub Integration",
      description:
        "Import and aggregate content from GitHub and other external sources seamlessly.",
      color: "var(--primary-orange)",
    },
    {
      icon: Network,
      title: "Cross-Node Communication",
      description:
        "Interact with users on different nodes as if they were on the same platform.",
      color: "var(--primary-purple)",
    },
    {
      icon: Lock,
      title: "Privacy Controls",
      description:
        "Choose who sees your content with friends-only and public visibility options.",
      color: "var(--primary-teal)",
    },
  ];

  const scenarios = [
    {
      title: "Cross-Node Interactions",
      description:
        "Like and comment on posts from authors on other nodes. Your interactions are sent to their inbox automatically.",
      icon: UserPlus,
    },
    {
      title: "Smart Content Distribution",
      description:
        "Public posts are automatically sent to all your followers across the network with intelligent routing.",
      icon: Share2,
    },
    {
      title: "Granular Privacy Controls",
      description:
        "Friends-only posts are only visible to your friends, giving you complete control over your content.",
      icon: Shield,
    },
    {
      title: "Inbox-Based Architecture",
      description:
        "All interactions flow through inboxes, ensuring proper content distribution and maintaining privacy.",
      icon: MessageCircle,
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background-alt">
      <div className="container mx-auto px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-[var(--primary-purple)] to-[var(--primary-pink)] bg-clip-text text-transparent mb-6">
            About SocialDistribution
          </h1>
          <p className="text-xl text-text-2 max-w-4xl mx-auto leading-relaxed">
            A revolutionary distributed, peer-to-peer social network that gives
            you complete autonomy over your social connections and data
          </p>
        </motion.div>

        {/* Vision Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16"
        >
          <Card className="p-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-text-1 mb-6">
                Our Vision
              </h2>
              <div className="prose prose-lg text-text-2">
                <p className="mb-6">
                  The web is fundamentally interconnected and peer-to-peer.
                  There's no great reason why we should all be locked into
                  Facebook, Google+, or MySpace. If these social networks had
                  open APIs, you could link between them and use the social
                  network you wanted. Furthermore, you would gain true autonomy
                  over your data and connections.
                </p>
                <p>
                  This innovative blogging/social network platform allows
                  importing of other sources of information (GitHub) as well as
                  seamless distribution and sharing of entries and content
                  across a distributed network of nodes, giving you the freedom
                  to choose where and how you connect.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-text-1 text-center mb-12">
            Key Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 0.6 + index * 0.1 }}
                >
                  <Card className="p-6 h-full hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center mb-4">
                      <div
                        className="p-3 rounded-lg mr-4"
                        style={{ backgroundColor: `${feature.color}20` }}
                      >
                        <Icon size={24} style={{ color: feature.color }} />
                      </div>
                      <h3 className="text-xl font-semibold text-text-1">
                        {feature.title}
                      </h3>
                    </div>
                    <p className="text-text-2 leading-relaxed">
                      {feature.description}
                    </p>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* How It Works */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mb-16"
        >
          <Card className="p-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-text-1 mb-8 text-center">
                How It Works
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {scenarios.map((scenario, index) => {
                  const Icon = scenario.icon;
                  return (
                    <motion.div
                      key={scenario.title}
                      initial={{ opacity: 0, x: index % 2 === 0 ? -20 : 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.6, delay: 1 + index * 0.2 }}
                      className="flex items-start space-x-4"
                    >
                      <div className="p-3 rounded-lg bg-[var(--primary-purple)] bg-opacity-20 flex-shrink-0">
                        <Icon
                          size={20}
                          className="text-[var(--primary-purple)]"
                        />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-text-1 mb-2">
                          {scenario.title}
                        </h3>
                        <p className="text-text-2 leading-relaxed">
                          {scenario.description}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Technical Details */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="mb-16"
        >
          <Card className="p-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-text-1 mb-6">
                Technical Architecture
              </h2>
              <div className="prose prose-lg text-text-2">
                <h3 className="text-xl font-semibold text-text-1 mb-4">
                  Intelligent Inbox-Based Distribution
                </h3>
                <p className="mb-6">
                  We use a sophisticated inbox model where you push entries to
                  your followers by sending them your entries. This ensures
                  reliable delivery and proper content routing.
                </p>

                <h3 className="text-xl font-semibold text-text-1 mb-4">
                  Content Flow
                </h3>
                <ul className="space-y-2 mb-6">
                  <li>
                    • All actions from authors are routed through the inbox of
                    the receiving authors
                  </li>
                  <li>
                    • Nodes store copies of entries because they receive them in
                    the inbox
                  </li>
                  <li>
                    • Likes and comments on entries are sent to the inbox of the
                    author
                  </li>
                  <li>
                    • Public entries are sent to the inboxes of all followers of
                    the author
                  </li>
                  <li>
                    • Friends-only entries are sent to the inboxes of all
                    friends of the author
                  </li>
                </ul>

                <h3 className="text-xl font-semibold text-text-1 mb-4">
                  Simplicity & Performance First
                </h3>
                <p>
                  We prioritize simplicity and performance over complex
                  features. We're keeping it clean and RESTful, focusing on the
                  core distributed social networking experience that just works.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Call to Action */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.4 }}
          className="text-center"
        >
          <Card className="p-8 bg-gradient-to-r from-[var(--primary-purple)] to-[var(--primary-pink)] bg-opacity-10">
            <h2 className="text-3xl font-bold text-text-1 mb-4">
              Join the Distributed Future
            </h2>
            <p className="text-lg text-text-2 mb-6 max-w-2xl mx-auto">
              Experience social networking without the walled gardens. Connect,
              share, and interact across a truly distributed network that puts
              you in control.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href="https://github.com/uofa-cmput404/s25-project-black"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-6 py-3 bg-[var(--primary-purple)] text-white rounded-lg hover:bg-[var(--primary-purple)]/90 transition-colors"
              >
                <GitBranch size={20} className="mr-2" />
                View on GitHub
              </a>
              <a
                href="/docs"
                className="inline-flex items-center px-6 py-3 border border-[var(--primary-purple)] text-[var(--primary-purple)] rounded-lg hover:bg-[var(--primary-purple)] hover:text-white transition-colors"
              >
                <MessageCircle size={20} className="mr-2" />
                Read Documentation
              </a>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default AboutPage;

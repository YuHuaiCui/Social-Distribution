import React from "react";
import { motion } from "framer-motion";
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  Users,
  Database,
  Globe,
  UserCheck,
  Settings,
  AlertTriangle,
  CheckCircle,
  Info,
} from "lucide-react";
import Card from "../components/ui/Card";

const PrivacyPage: React.FC = () => {
  const privacyFeatures = [
    {
      icon: Shield,
      title: "Data Ownership",
      description:
        "You own your data. We don't sell, rent, or monetize your personal information.",
      color: "var(--primary-purple)",
    },
    {
      icon: Lock,
      title: "Privacy Controls",
      description:
        "Choose who sees your content with granular privacy settings - public, friends-only, or private.",
      color: "var(--primary-teal)",
    },
    {
      icon: Eye,
      title: "Transparency",
      description:
        "Full visibility into how your data is used and stored across the distributed network.",
      color: "var(--primary-pink)",
    },
    {
      icon: Database,
      title: "Distributed Storage",
      description:
        "Your data is stored across multiple nodes, not centralized in one location.",
      color: "var(--primary-orange)",
    },
    {
      icon: Users,
      title: "Social Privacy",
      description:
        "Control who can see your posts, profile, and activity with flexible privacy options.",
      color: "var(--primary-purple)",
    },
    {
      icon: Globe,
      title: "Cross-Node Privacy",
      description:
        "Privacy settings work across all nodes in the distributed network.",
      color: "var(--primary-teal)",
    },
  ];

  const privacyPractices = [
    {
      title: "Content Visibility",
      description:
        "You control who sees your posts with public, friends-only, and private options. Friends-only posts are only visible to your approved friends.",
      icon: EyeOff,
    },
    {
      title: "Data Collection",
      description:
        "We collect minimal data necessary for platform functionality. No tracking, analytics, or third-party data sharing.",
      icon: Database,
    },
    {
      title: "Account Control",
      description:
        "You can delete your account and all associated data at any time. No data retention beyond your control.",
      icon: UserCheck,
    },
    {
      title: "Network Privacy",
      description:
        "Interactions across nodes respect your privacy settings. Your data is not shared beyond your chosen visibility.",
      icon: Globe,
    },
  ];

  const dataHandling = [
    {
      title: "What We Collect",
      items: [
        "Account information (username, email, profile data)",
        "Content you create and share",
        "Social connections (follows, friends)",
        "Platform usage for functionality",
      ],
      icon: Database,
      color: "var(--primary-purple)",
    },
    {
      title: "What We Don't Collect",
      items: [
        "Personal browsing history",
        "Location data",
        "Device information",
        "Third-party tracking data",
      ],
      icon: Shield,
      color: "var(--primary-teal)",
    },
    {
      title: "How We Protect Your Data",
      items: [
        "Distributed storage across nodes",
        "No centralized data warehouse",
        "Privacy settings respected network-wide",
        "Minimal data retention policies",
      ],
      icon: Lock,
      color: "var(--primary-pink)",
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
            Privacy Policy
          </h1>
          <p className="text-xl text-text-2 max-w-4xl mx-auto leading-relaxed">
            Your privacy is fundamental to our distributed social network. Learn
            how we protect your data and give you control.
          </p>
        </motion.div>

        {/* Privacy Philosophy */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mb-16"
        >
          <Card className="p-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-text-1 mb-6">
                Our Privacy Philosophy
              </h2>
              <div className="prose prose-lg text-text-2">
                <p className="mb-6">
                  At SocialDistribution, we believe privacy is a fundamental
                  human right, not a feature. In a world where social media
                  platforms profit from your personal data, we've built
                  something different - a platform where you own your data and
                  control your privacy.
                </p>
                <p className="mb-6">
                  Our distributed architecture means your data isn't stored in
                  one centralized location controlled by a corporation. Instead,
                  it's distributed across multiple nodes, giving you true
                  ownership and control over your digital life.
                </p>
                <p>
                  We collect only the minimum data necessary to provide our
                  services, and we're transparent about what we collect and how
                  we use it. Your privacy settings work across the entire
                  distributed network, ensuring your content is only visible to
                  those you choose.
                </p>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Privacy Features Grid */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-text-1 text-center mb-12">
            Privacy Features
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {privacyFeatures.map((feature, index) => {
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

        {/* Privacy Practices */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.8 }}
          className="mb-16"
        >
          <Card className="p-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-text-1 mb-8 text-center">
                How We Protect Your Privacy
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {privacyPractices.map((practice, index) => {
                  const Icon = practice.icon;
                  return (
                    <motion.div
                      key={practice.title}
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
                          {practice.title}
                        </h3>
                        <p className="text-text-2 leading-relaxed">
                          {practice.description}
                        </p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Data Handling */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.2 }}
          className="mb-16"
        >
          <h2 className="text-3xl font-bold text-text-1 text-center mb-12">
            Data Handling
          </h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {dataHandling.map((section, index) => {
              const Icon = section.icon;
              return (
                <motion.div
                  key={section.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: 1.4 + index * 0.2 }}
                >
                  <Card className="p-6 h-full">
                    <div className="flex items-center mb-4">
                      <div
                        className="p-3 rounded-lg mr-4"
                        style={{ backgroundColor: `${section.color}20` }}
                      >
                        <Icon size={24} style={{ color: section.color }} />
                      </div>
                      <h3 className="text-xl font-semibold text-text-1">
                        {section.title}
                      </h3>
                    </div>
                    <ul className="space-y-2">
                      {section.items.map((item, itemIndex) => (
                        <li
                          key={itemIndex}
                          className="flex items-start space-x-2"
                        >
                          <CheckCircle
                            size={16}
                            className="text-[var(--primary-teal)] mt-0.5 flex-shrink-0"
                          />
                          <span className="text-text-2 text-sm">{item}</span>
                        </li>
                      ))}
                    </ul>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        </motion.div>

        {/* Privacy Settings Guide */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.6 }}
          className="mb-16"
        >
          <Card className="p-8">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-text-1 mb-6">
                Privacy Settings Guide
              </h2>
              <div className="prose prose-lg text-text-2">
                <h3 className="text-xl font-semibold text-text-1 mb-4">
                  <Settings className="inline mr-2" />
                  Managing Your Privacy
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <Eye
                        className="text-[var(--primary-purple)] mt-1"
                        size={20}
                      />
                      <div>
                        <h4 className="font-semibold text-text-1">
                          Public Posts
                        </h4>
                        <p className="text-sm text-text-2">
                          Visible to everyone across the network
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Users
                        className="text-[var(--primary-teal)] mt-1"
                        size={20}
                      />
                      <div>
                        <h4 className="font-semibold text-text-1">
                          Friends-Only Posts
                        </h4>
                        <p className="text-sm text-text-2">
                          Only visible to your approved friends
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <EyeOff
                        className="text-[var(--primary-pink)] mt-1"
                        size={20}
                      />
                      <div>
                        <h4 className="font-semibold text-text-1">
                          Private Posts
                        </h4>
                        <p className="text-sm text-text-2">
                          Only visible to you
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-start space-x-3">
                      <UserCheck
                        className="text-[var(--primary-purple)] mt-1"
                        size={20}
                      />
                      <div>
                        <h4 className="font-semibold text-text-1">
                          Profile Privacy
                        </h4>
                        <p className="text-sm text-text-2">
                          Control who can see your profile information
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <Globe
                        className="text-[var(--primary-teal)] mt-1"
                        size={20}
                      />
                      <div>
                        <h4 className="font-semibold text-text-1">
                          Cross-Node Privacy
                        </h4>
                        <p className="text-sm text-text-2">
                          Settings apply across all nodes in the network
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start space-x-3">
                      <AlertTriangle
                        className="text-[var(--primary-orange)] mt-1"
                        size={20}
                      />
                      <div>
                        <h4 className="font-semibold text-text-1">
                          Data Deletion
                        </h4>
                        <p className="text-sm text-text-2">
                          Delete your account and all data permanently
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>

        {/* Important Disclaimers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 1.8 }}
          className="mb-16"
        >
          <Card className="p-8 border-l-4 border-[var(--primary-orange)]">
            <div className="max-w-4xl mx-auto">
              <h2 className="text-3xl font-bold text-text-1 mb-6">
                Important Disclaimers
              </h2>
              <div className="prose prose-lg text-text-2">
                <div className="flex items-start space-x-3 mb-6">
                  <AlertTriangle
                    className="text-[var(--primary-orange)] mt-1 flex-shrink-0"
                    size={24}
                  />
                  <div>
                    <h3 className="text-xl font-semibold text-text-1 mb-2">
                      Distributed Network Responsibility
                    </h3>
                    <p className="mb-4">
                      SocialDistribution operates as a distributed social
                      network where data is shared across multiple nodes. While
                      we implement privacy controls and distributed storage, we
                      cannot guarantee the security of data once it has been
                      distributed to other nodes in the network.
                    </p>
                    <p className="mb-4">
                      <strong>Important:</strong> We are not responsible for
                      data leaks, breaches, or unauthorized access that may
                      occur on other nodes in the distributed network. Each node
                      operator is responsible for their own data security
                      practices.
                    </p>
                    <p>
                      Users should be aware that content shared publicly or with
                      friends may be stored on multiple nodes across the
                      network, and we cannot control how individual node
                      operators handle or secure this data.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <Info
                    className="text-[var(--primary-teal)] mt-1 flex-shrink-0"
                    size={24}
                  />
                  <div>
                    <h3 className="text-xl font-semibold text-text-1 mb-2">
                      Your Responsibility
                    </h3>
                    <p className="mb-4">
                      You are responsible for the content you share and the
                      privacy settings you choose. Consider the sensitivity of
                      your information before posting, especially when using
                      public visibility.
                    </p>
                    <p>
                      We recommend reviewing your privacy settings regularly and
                      being mindful of what you share in a distributed network
                      environment.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default PrivacyPage;

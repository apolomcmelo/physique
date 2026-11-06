import React from 'react';
import { useWindowDimensions } from 'react-native';
import { Tabs } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { APP_TABS, isWideLayout } from '../../src/ui/navigation/tabConfig';
import { SideNav } from '../../src/ui/navigation/SideNav';
import { Colors, FontFamily } from '../../src/ui/theme';

type TabBarRenderer = NonNullable<React.ComponentProps<typeof Tabs>['tabBar']>;

const renderSideNav: TabBarRenderer = (props) => <SideNav {...props} />;

export default function TabsLayout() {
    const { width } = useWindowDimensions();
    const wide = isWideLayout(width);

    return (
        <Tabs
            tabBar={wide ? renderSideNav : undefined}
            screenOptions={{
                headerShown: false,
                tabBarPosition: wide ? 'left' : 'bottom',
                tabBarStyle: {
                    backgroundColor: Colors.surfaceLowest,
                    borderTopColor: Colors.border,
                    borderTopWidth: 1,
                },
                tabBarLabelStyle: { fontFamily: FontFamily.medium },
                tabBarActiveTintColor: Colors.primary,
                tabBarInactiveTintColor: Colors.textDisabled,
            }}
        >
            {APP_TABS.map((tab) => (
                <Tabs.Screen
                    key={tab.name}
                    name={tab.name}
                    options={{
                        title: tab.title,
                        tabBarIcon: ({ color, size }) => (
                            <MaterialIcons name={tab.icon} size={size} color={color} />
                        ),
                    }}
                />
            ))}
        </Tabs>
    );
}
